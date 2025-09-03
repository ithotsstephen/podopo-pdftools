# PDF Forge — PWA

A ready-to-deploy Progressive Web App for editing and converting PDFs in the browser.

## Features
- Merge PDFs
- Split / extract selected pages
- Add text watermark (angle, size, opacity)
- Rotate selected pages
- Convert images (JPG/PNG) → PDF
- PWA: install, offline shell caching, icons, manifest, service worker

> All processing is local in your browser using [pdf-lib].

## How to deploy
Upload the contents of this folder to any static host (Vercel, Netlify, GitHub Pages, S3+CloudFront, etc.).
Ensure `service-worker.js` is served with correct MIME type `text/javascript`.

## Development
Open `index.html` in a local HTTP server (e.g., `npx serve .`) to test service worker.
# podopo-pdftools
