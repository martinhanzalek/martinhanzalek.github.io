// Constants
const STORAGE_KEY = 'audiobook-progress';
const CHAPTER_COUNT = 20;
const AUTO_SAVE_INTERVAL = 5000; // milliseconds
// Base path for audio files - use '..' for relative paths from index.html location
const BASE_PATH = './';  // Change to '/mzb/' if needed for absolute paths

// State
let chapters = [];
let currentChapterId = 1;
let saveInterval = null;
let listenersInitialized = false;
let rangeRequestsSupported = null; // null = unknown, true = supported, false = not supported

// DOM elements
const audioPlayer = document.getElementById('audioPlayer');
const audioSource = document.getElementById('audioSource');
const chapterList = document.getElementById('chapterList');

// Check if server supports range requests
async function checkRangeRequestSupport() {
    if (rangeRequestsSupported !== null) return rangeRequestsSupported;

    try {
        const testFile = `${BASE_PATH}audio/mzb-001.m4a`;
        const response = await fetch(testFile, { method: 'HEAD' });
        rangeRequestsSupported = response.headers.get('accept-ranges') === 'bytes';

        if (!rangeRequestsSupported) {
            console.warn('Server does not support HTTP range requests. Audio seeking may not work properly.');
        }

        return rangeRequestsSupported;
    } catch (error) {
        console.error('Failed to check range request support:', error);
        rangeRequestsSupported = false;
        return false;
    }
}

// Initialize chapters data
function initializeChapters() {
    chapters = Array.from({ length: CHAPTER_COUNT }, (_, index) => {
        const chapterNum = index + 1;
        const paddedNum = String(chapterNum).padStart(3, '0');
        return {
            id: chapterNum,
            filename: `${BASE_PATH}audio/mzb-${paddedNum}.m4a`,
            title: `Kapitola ${chapterNum}`
        };
    });
}

// Render chapter list in DOM
function renderChapterList() {
    chapterList.innerHTML = '';

    chapters.forEach(chapter => {
        const li = document.createElement('li');
        li.textContent = chapter.title;
        li.dataset.chapterId = chapter.id;
        li.addEventListener('click', () => handleChapterClick(chapter.id));
        chapterList.appendChild(li);
    });
}

// Handle chapter click
function handleChapterClick(chapterId) {
    currentChapterId = chapterId;
    loadChapter(chapterId, 0);
    saveProgress();
    audioPlayer.play();
}

// Load chapter
async function loadChapter(chapterId, startTime = 0) {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;

    currentChapterId = chapterId;
    audioSource.src = chapter.filename;
    audioPlayer.load();

    // Set start time after metadata is loaded
    if (startTime > 0) {
        // Check if server supports range requests on first load
        if (rangeRequestsSupported === null) {
            await checkRangeRequestSupport();
        }

        // If range requests aren't supported, we need to wait for the entire file to load
        const eventToWaitFor = rangeRequestsSupported ? 'loadeddata' : 'canplaythrough';

        audioPlayer.addEventListener(eventToWaitFor, function setTime() {
            try {
                audioPlayer.currentTime = startTime;
                console.log(`Seeked to ${startTime}s in chapter ${chapterId} (using ${eventToWaitFor})`);
            } catch (error) {
                console.error('Failed to set currentTime:', error);
                // Show user-friendly message if seeking consistently fails
                if (!rangeRequestsSupported) {
                    console.warn('Seeking not supported by server. The audio will play from the beginning.');
                }
            }
        }, { once: true });
    }

    updateChapterHighlight(chapterId);
}

// Update chapter highlighting
function updateChapterHighlight(chapterId) {
    // Remove previous active (direct selection)
    const currentActive = chapterList.querySelector('li.active');
    if (currentActive) {
        currentActive.classList.remove('active');
    }

    // Add new active (direct selection)
    const newActive = chapterList.querySelector(`li[data-chapter-id="${chapterId}"]`);
    if (newActive) {
        newActive.classList.add('active');
    }
}

// Initialize app
async function init() {
    initializeChapters();
    renderChapterList();

    // Check range request support early
    await checkRangeRequestSupport();

    // Load saved progress or start from chapter 1
    const progress = loadProgress();
    if (progress) {
        await loadChapter(progress.chapterId, progress.time);
    } else {
        await loadChapter(1, 0);
    }

    setupAudioEventListeners();
}

// Setup audio event listeners
function setupAudioEventListeners() {
    if (listenersInitialized) return;
    listenersInitialized = true;

    // Handle chapter end - advance to next chapter
    audioPlayer.addEventListener('ended', handleChapterEnd);

    // Handle audio loading errors
    audioPlayer.addEventListener('error', handleAudioError);

    // Save on play
    audioPlayer.addEventListener('play', saveProgress);

    // Save on pause
    audioPlayer.addEventListener('pause', saveProgress);

    // Save every 10 seconds during playback
    audioPlayer.addEventListener('play', startAutoSave);
    audioPlayer.addEventListener('pause', stopAutoSave);
    audioPlayer.addEventListener('ended', stopAutoSave);

    // Save before page unload
    window.addEventListener('beforeunload', saveProgress);
}

// Start auto-save interval
function startAutoSave() {
    stopAutoSave(); // Clear any existing interval
    saveInterval = setInterval(saveProgress, AUTO_SAVE_INTERVAL);
}

// Stop auto-save interval
function stopAutoSave() {
    if (saveInterval) {
        clearInterval(saveInterval);
        saveInterval = null;
    }
}

// Handle chapter end
function handleChapterEnd() {
    const nextChapterId = currentChapterId + 1;

    // Check if there's a next chapter
    if (nextChapterId <= chapters.length) {
        currentChapterId = nextChapterId;
        loadChapter(nextChapterId, 0);
        saveProgress();
        audioPlayer.play();
    }
}

// Handle audio loading errors
function handleAudioError() {
    const error = audioPlayer.error;
    let errorMessage = 'Chyba při načítání audio souboru';

    if (error) {
        switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = 'Načítání audia bylo přerušeno';
                break;
            case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = 'Chyba sítě při načítání audia';
                break;
            case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Audio soubor je poškozený nebo nepodporovaný';
                break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio formát není podporován nebo soubor nebyl nalezen';
                break;
        }
    }

    console.error(`Audio error for chapter ${currentChapterId}:`, errorMessage, error);

    // Show user-friendly error in the UI
    alert(`${errorMessage}\n\nKapitola: ${currentChapterId}\nSoubor: ${chapters.find(ch => ch.id === currentChapterId)?.filename}`);
}

// Save progress to localStorage
function saveProgress() {
    const progress = {
        chapterId: currentChapterId,
        time: audioPlayer.currentTime || 0,
        lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Load progress from localStorage
function loadProgress() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const progress = JSON.parse(stored);

        // Validate data
        if (
            typeof progress.chapterId !== 'number' ||
            progress.chapterId < 1 ||
            progress.chapterId > chapters.length ||
            typeof progress.time !== 'number' ||
            progress.time < 0
        ) {
            return null;
        }

        return progress;
    } catch (error) {
        console.error('Error loading progress:', error);
        return null;
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
