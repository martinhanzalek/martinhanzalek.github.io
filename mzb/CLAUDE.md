# Project Overview

Pure HTML5 project using modern web standards with minimal dependencies.

## Stack

- **HTML5**: Modern semantic HTML
- **CSS**: Vanilla CSS with normalization
- **JavaScript**: Modern ES6+ JavaScript
- **Dependencies**: CSS normalization library only (e.g., normalize.css or modern-normalize)

## Development Guidelines

### HTML
- Use semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`)
- Prefer native HTML elements over divs where applicable
- Ensure accessibility with proper ARIA attributes when needed
- Use valid, well-formed markup

### CSS
- Write modern CSS using custom properties (CSS variables)
- Use CSS Grid and Flexbox for layouts
- Mobile-first responsive design
- Avoid preprocessors (SASS, LESS) - use native CSS features
- Use logical properties (`inline`, `block`) for better internationalization

### JavaScript
- Modern ES6+ syntax (const/let, arrow functions, template literals, destructuring)
- Use native DOM APIs (querySelector, addEventListener, fetch)
- Async/await for asynchronous operations
- No frameworks or heavy libraries - vanilla JavaScript only
- Organize code in modules using ES6 imports/exports when appropriate

### Code Style
- Clear, descriptive naming
- Keep functions small and focused
- Prefer composition over inheritance
- Comment only when the "why" is non-obvious

## File Organization

```
/
├── index.html
├── css/
│   ├── normalize.css (or modern-normalize.css)
│   └── styles.css
└── js/
    └── main.js
```

## Browser Support

Target modern evergreen browsers (latest versions of Chrome, Firefox, Safari, Edge).
