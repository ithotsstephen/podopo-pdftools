/* PDF Forge App JS */
const $ = (sel) => document.querySelector(sel);

const toast = (msg) => {
  const t = $("#toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => (t.style.display = "none"), 3200);
};

// Handle tool tabs
document.querySelectorAll(".tool-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => {
      p.style.display = "none";
      // hide all interactive sections
      const interactive = p.querySelector('[class$="-interactive"]');
      if (interactive) interactive.style.display = "none";
    });
  // reset all module state and UI when switching modules
  try { resetAllModules(); } catch (e) {}
    btn.classList.add("active");
    const target = btn.getAttribute("data-target");
    const panel = document.querySelector(target);
    if (panel) {
      panel.style.display = "block";
      const interactive = panel.querySelector('[class$="-interactive"]');
      if (interactive) interactive.style.display = "block";
    }
    // Show or hide global preview: hide for watermark (it has its own canvas), show for other tools
    try {
      const pp = document.querySelector('#previewPanel');
      // For watermark we also show the main preview (we'll render the watermark canvas into it)
      if (target === '#watermark') {
        if (pp) pp.style.display = 'block';
        try { if (typeof renderWmPreview === 'function') renderWmPreview().catch(()=>{}); } catch (e) {}
      } else {
        if (pp) pp.style.display = 'block';
      }
    } catch (e) { /* ignore */ }
  });
});

// Header tool select quick nav
const toolMenu = document.querySelector('#toolMenu');
if (toolMenu) {
  toolMenu.addEventListener('change', (e) => {
    const sel = e.target.value;
    // hide panels and unset toolbar buttons
    document.querySelectorAll('.panel').forEach(p => {
      p.style.display = 'none';
      // hide all interactive sections
      const interactive = p.querySelector('[class$="-interactive"]');
      if (interactive) interactive.style.display = "none";
    });
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    // show selected
    const el = document.querySelector(sel);
    if (el) {
      el.style.display = 'block';
      const interactive = el.querySelector('[class$="-interactive"]');
      if (interactive) interactive.style.display = "block";
    }
    // if selected via header menu, hide preview for watermark and render its preview; otherwise show preview
    try {
      const pp = document.querySelector('#previewPanel');
    // clear all module state when selecting tool from header
  try { resetAllModules(); } catch (e) {}
  if (sel === '#watermark') {
        if (pp) pp.style.display = 'block';
        try { if (typeof renderWmPreview === 'function') renderWmPreview().catch(()=>{}); } catch (e) {}
      } else {
        if (pp) pp.style.display = 'block';
      }
    } catch (e) {}
    // mark matching toolbar button active
    const tb = document.querySelector(`.tool-btn[data-target="${sel}"]`);
    if (tb) tb.classList.add('active');
  });
}

// Install prompt
let deferredPrompt;
const installBtn = $("#installBtn");
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'inline-block';
});
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const res = await deferredPrompt.userChoice;
  if (res.outcome === 'accepted') toast('Installed!');
  deferredPrompt = null;
  installBtn.style.display = 'none';
});
$("#addToHome").addEventListener("click", (e) => {
  e.preventDefault();
  if (deferredPrompt) installBtn.click();
  else toast("Use your browser menu → Add to Home Screen");
});

// Utility: download bytes as file and show preview
function downloadAndPreview(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  // ensure the preview panel is visible and show the PDF in the iframe
  try {
    const pp = document.querySelector('#previewPanel');
    if (pp) pp.style.display = 'block';
    const iframe = document.querySelector('#preview');
    if (iframe) {
      iframe.src = url;
      // bring into view on small screens
      try { iframe.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
  } catch (e) {
    console.info('Preview unavailable', e);
  }
}

// Reset the main preview iframe and watermark canvas when switching tools
function resetPreview() {
  try {
    const iframe = document.querySelector('#preview');
    if (iframe) {
      // revoke any blob URLs used as preview (but keep download blobUrls intact)
      try {
        const src = iframe.src || iframe.getAttribute('src');
        if (src && src.startsWith('blob:')) URL.revokeObjectURL(src);
      } catch (e) {}
      // remove src and show a friendly placeholder in the iframe using srcdoc
      try { iframe.removeAttribute('src'); } catch (e) {}
      try {
        iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#444;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;background:#fafafa} .msg{max-width:540px;text-align:center;font-size:1rem;color:#666}</style></head><body><div class="msg">Results appear here; you can view or download them.</div></body></html>`;
      } catch (e) { try { iframe.removeAttribute('srcdoc'); } catch (ee) {} }
    }
  } catch (e) {}
  try {
    // revoke any temporary preview URLs stored on download anchors
    ['#pdf2docDownload','#pdf2docDownload','#pdf2docDownload'].forEach(sel => {
      const a = document.querySelector(sel);
      if (a && a.dataset && a.dataset.previewUrl) {
        try { URL.revokeObjectURL(a.dataset.previewUrl); } catch (e) {}
        delete a.dataset.previewUrl;
      }
    });
  } catch (e) {}
  try {
    if (typeof wmPreviewCtx !== 'undefined' && wmPreviewCtx) {
      wmPreviewCtx.clearRect(0,0, wmPreviewCanvas.width, wmPreviewCanvas.height);
    }
  } catch (e) {}
}

// Reset all module inputs, downloads, and internal state when switching tools
function resetAllModules() {
  try {
    // clear file inputs
    ['#mergeFiles','#splitFile','#wmFile','#wmLogo','#rotFile','#imgFiles','#pdf2docFile','#ocrFile','#doc2pdfFile'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el && 'value' in el) el.value = '';
    });
    // hide and revoke download links
    ['#mergeDownload','#splitDownload','#wmDownload','#rotDownload','#img2pdfDownload','#pdf2docDownload','#ocrDownload','#doc2pdfDownload'].forEach(sel => {
      const a = document.querySelector(sel);
      if (a) {
        try { if (a.dataset?.blobUrl) { URL.revokeObjectURL(a.dataset.blobUrl); } } catch (e) {}
        try { if (a.dataset?.previewUrl) { URL.revokeObjectURL(a.dataset.previewUrl); } } catch (e) {}
        a.removeAttribute('href'); a.style.display = 'none'; delete a.dataset.blobUrl; delete a.dataset.previewUrl;
      }
    });
    // clear merge list
    try { mergeFilesList.length = 0; renderMergeList(); } catch (e) {}
    // clear watermark preview state
    try { _wmPreviewPdf = null; _wmPreviewPdfTotal = 0; _wmPreviewCurrent = 1; wmPreviewBaseImageData = null; if (typeof _wmLastLogoUrl !== 'undefined' && _wmLastLogoUrl) { try { URL.revokeObjectURL(_wmLastLogoUrl); } catch(e){} _wmLastLogoUrl = null;} if (wmPreviewCtx) try { wmPreviewCtx.clearRect(0,0, wmPreviewCanvas.width, wmPreviewCanvas.height); } catch(e){} } catch (e) {}
    // clear pdf2doc progress/status
    try { const progressEl = document.querySelector('#pdf2docProgress'); if (progressEl) progressEl.style.display='none'; const progressBar = document.querySelector('#pdf2docProgressBar'); if (progressBar) progressBar.style.width='0%'; const statusEl = document.querySelector('#pdf2docStatus'); if (statusEl) statusEl.textContent=''; } catch (e) {}
    // clear OCR outputs and progress
    try { const ocrOut = document.querySelector('#ocrOutput'); if (ocrOut) ocrOut.value=''; const ocrProg = document.querySelector('#ocrProgress'); if (ocrProg) ocrProg.style.display='none'; const ocrBar = document.querySelector('#ocrProgressBar'); if (ocrBar) ocrBar.style.width='0%'; const ocrStatus = document.querySelector('#ocrStatus'); if (ocrStatus) ocrStatus.textContent=''; const ocrDl = document.querySelector('#ocrDownload'); if (ocrDl) { ocrDl.style.display='none'; ocrDl.removeAttribute('href'); } } catch (e) {}
    // rotate & other simple resets
    try { const rotRange = document.querySelector('#rotRange'); if (rotRange) rotRange.value=''; } catch (e) {}
    // finally clear preview iframe
    try { resetPreview(); } catch (e) {}
  } catch (e) { console.warn('resetAllModules failed', e); }
}

// Parse page ranges like "1-3,5,9-10" into zero-based array of indices
function parseRange(rangeStr, total) {
  if (!rangeStr || rangeStr.trim().toLowerCase() === "all") {
    return Array.from({length: total}, (_, i) => i);
  }
  const out = new Set();
  for (const part of rangeStr.split(",")) {
    const s = part.trim();
    if (!s) continue;
    if (s.includes("-")) {
      const [a, b] = s.split("-").map(v => parseInt(v.trim(),10));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const start = Math.max(1, Math.min(a,b));
        const end   = Math.min(total, Math.max(a,b));
        for (let i=start; i<=end; i++) out.add(i-1);
      }
    } else {
      const n = parseInt(s,10);
      if (Number.isFinite(n) && n>=1 && n<=total) out.add(n-1);
    }
  }
  return Array.from(out).sort((x,y)=>x-y);
}

// Ensure pdf-lib available
function ensurePdfLib() {
  if (window.PDFLib) return true;
  toast("Loading PDF engine failed. Check your connection.");
  return false;
}

// Try to dynamically load Tesseract if not present
async function ensureTesseract() {
  if (window.Tesseract) return;
  toast('Loading OCR engine...');
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js', 'Tesseract');
  } catch (e) {
    console.error('Failed to load Tesseract', e);
    throw e;
  }
}

// Utility: render a pdf.js page to PNG blob (reuse renderPageToPng if present)
async function renderPageToPngFromPdf(pdf, pageNum, scale = 2) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
}

document.querySelector('#ocrBtn')?.addEventListener('click', async () => {
  const file = document.querySelector('#ocrFile').files?.[0];
  if (!file) return toast('Select an image or PDF first');

  if (!window.OCR) return toast('OCR module not loaded');
  const lang = document.querySelector('#ocrLang')?.value || 'eng';
  const progressEl = document.querySelector('#ocrProgress');
  const progressBar = document.querySelector('#ocrProgressBar');
  const statusEl = document.querySelector('#ocrStatus');
  const setProg = (pct, text) => { if (progressEl) { progressEl.style.display='block'; progressBar.style.width = pct + '%'; if (statusEl) statusEl.textContent = text || ''; } };

  try {
    // Build pages: for PDFs, use OCR.renderPdfPagesToBlobs; for images use the file blob
    let pages = [];
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (typeof window.pdfjsLib === 'undefined') { toast('PDF renderer not available for OCR.'); return; }
      const array = await file.arrayBuffer();
      const total = (await window.pdfjsLib.getDocument({ data: array }).promise).numPages;
      const indices = parseRange((document.querySelector('#ocrRange')?.value || 'all').trim(), total).map(i=>i+1);
      let rendered = await window.OCR.renderPdfPagesToBlobs(array, indices, 2);
      pages = rendered;
    } else {
      const buf = await file.arrayBuffer();
      pages = [{ page: 1, blob: new Blob([buf], { type: file.type || 'image/png' }) }];
    }

    // Recognize using OCR module
    const text = await window.OCR.recognizeBlobs(pages, lang, (m) => {
      if (m && m.status === 'render') setProg(30 + Math.round((m.index / (m.total||1)) * 30), `Rendering page ${m.page}`);
      else if (m && m.status === 'done') setProg(60 + Math.round((m.index / (m.total||1)) * 30), `Recognized page ${m.page}`);
      else if (m && m.status) setProg(10, m.status + (m.page ? (' p'+m.page) : ''));
    });

    document.querySelector('#ocrOutput').value = text || '';
    setProg(100, 'Done');
    const dl = document.querySelector('#ocrDownload');
    const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
    dl.href = URL.createObjectURL(blob); dl.style.display='inline-flex'; dl.download = (file.name.replace(/\.pdf$|\.png$|\.jpg$/i,'') || 'ocr') + '.txt';
    document.querySelector('#ocrCopy')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(document.querySelector('#ocrOutput').value); toast('Copied to clipboard'); } catch (e) { toast('Copy failed'); }});
  } catch (err) {
    console.error('OCR failed', err);
    toast('OCR failed. Check console for details.');
  }
});

document.querySelector('#ocrCheck')?.addEventListener('click', async () => {
  if (!window.OCR) return toast('OCR module missing');
  try {
    const res = await window.OCR.check();
    console.info('OCR check', res);
    toast(`OCR check: pdfjs=${res.pdfjsLib?'ok':'no'}, tesseract=${res.Tesseract?'ok':'no'}`);
  } catch (e) {
    console.error('OCR check failed', e);
    toast('OCR check failed (see console)');
  }
});

// Try to dynamically load PDF.js and docx if they're not present
function loadScript(src, globalName, timeout = 15000) {
  return new Promise((resolve, reject) => {
    if (globalName && window[globalName]) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    const t = setTimeout(() => reject(new Error('timeout loading ' + src)), timeout);
    s.onload = () => { clearTimeout(t); resolve(); };
    s.onerror = (e) => { clearTimeout(t); reject(e || new Error('failed to load ' + src)); };
    document.head.appendChild(s);
  });
}

async function ensurePdfAndDocx() {
  // prefer already-present globals
  if (window.pdfjsLib && window.docx) return;
  toast('Loading conversion libraries...');

  // Candidate URLs (primary CDN first, then alternates, then local vendor paths)
  const pdfCandidates = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.min.js',
    '/vendor/pdf.min.js'
  ];
  const docxCandidates = [
    'https://cdn.jsdelivr.net/npm/docx@7.6.0/build/index.umd.js',
    'https://unpkg.com/docx@7.6.0/build/index.umd.js',
    '/vendor/docx.umd.js'
  ];

  async function tryLoadCandidates(candidates, globalName, attemptsArr) {
    for (const url of candidates) {
      attemptsArr.push(url);
      try {
        await loadScript(url, globalName, 20000);
        // small settle
        await new Promise(r => setTimeout(r, 40));
        if (!globalName || window[globalName]) return url;
      } catch (e) {
        console.warn('Failed to load', url, e);
        // try next
      }
    }
    throw new Error('No candidate succeeded for ' + (globalName || 'script'));
  }

  try {
    const pdfAttempts = [];
    const docxAttempts = [];
    if (!window.pdfjsLib) {
      const used = await tryLoadCandidates(pdfCandidates, 'pdfjsLib', pdfAttempts);
      console.info('Loaded pdf.js from', used);
      // try set workerSrc for pdf.js if available
      try {
        if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = (used && used.includes('cdnjs') ? used.replace(/pdf\.min\.js$/,'pdf.worker.min.js') : (used.includes('/vendor/') ? '/vendor/pdf.worker.min.js' : used.replace(/pdf\.min\.js$/,'pdf.worker.min.js')));
        }
      } catch (e) { /* ignore */ }
    }
    if (!window.docx) {
      const used2 = await tryLoadCandidates(docxCandidates, 'docx', docxAttempts);
      console.info('Loaded docx from', used2);
    }
    // expose attempt info for diagnostics
    window.__libLoadInfo = { pdfAttempts, docxAttempts, pdfjsLib: !!window.pdfjsLib, docx: !!window.docx };
  } catch (err) {
    console.error('Failed to load conversion libraries', err);
    throw err;
  }
}

// If pdf.js was included via <script> tag, ensure workerSrc points to a usable worker.
try {
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // prefer local vendor worker if present
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
      console.info('pdf.js workerSrc set to /vendor/pdf.worker.min.js');
    }
  }
} catch (e) { /* ignore */ }

/* ---- Merge PDFs ---- */
// Maintain an ordered list of files for merging
const mergeFilesList = [];

function renderMergeList() {
  const container = $("#mergeList");
  container.innerHTML = '';
  mergeFilesList.forEach((f, idx) => {
    const row = document.createElement('div');
    row.className = 'merge-row';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';

    const name = document.createElement('div');
    name.textContent = `${idx+1}. ${f.name}`;
    name.style.flex = '1';

    const up = document.createElement('button'); up.textContent = '↑';
    const down = document.createElement('button'); down.textContent = '↓';
    const remove = document.createElement('button'); remove.textContent = '✕';

    up.addEventListener('click', () => { if (idx>0) { [mergeFilesList[idx-1], mergeFilesList[idx]] = [mergeFilesList[idx], mergeFilesList[idx-1]]; renderMergeList(); } });
    down.addEventListener('click', () => { if (idx<mergeFilesList.length-1) { [mergeFilesList[idx+1], mergeFilesList[idx]] = [mergeFilesList[idx], mergeFilesList[idx+1]]; renderMergeList(); } });
    remove.addEventListener('click', () => { mergeFilesList.splice(idx,1); renderMergeList(); });

    row.appendChild(name);
    row.appendChild(up);
    row.appendChild(down);
    row.appendChild(remove);
    container.appendChild(row);
  });
}

// When user selects files from the input, append them to the ordered list
$("#mergeFiles").addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  for (const f of files) mergeFilesList.push(f);
  renderMergeList();
  // show preview panel (user expects preview column visible) and hide stale download link
  try { const pp = document.querySelector('#previewPanel'); if (pp) pp.style.display = 'block'; } catch (e) {}
  try { const md = document.querySelector('#mergeDownload'); if (md) md.style.display = 'none'; } catch (e) {}
  // clear input so same file can be re-added if needed
  e.target.value = '';
});

$("#mergeBtn").addEventListener("click", async () => {
  if (!ensurePdfLib()) return;
  if (!mergeFilesList.length) return toast("Select PDF files to merge.");
  const { PDFDocument } = PDFLib;
  try {
    const out = await PDFDocument.create();
    for (const file of mergeFilesList) {
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach(p => out.addPage(p));
    }
    const pdfBytes = await out.save();
    // populate download link and preview, but do NOT trigger an automatic download — user must click
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    // revoke previous URL if present to avoid leaks
    try {
      const prev = $("#mergeDownload").dataset?.blobUrl;
      if (prev) URL.revokeObjectURL(prev);
    } catch (e) {}
    $("#mergeDownload").style.display = "inline-flex";
    $("#mergeDownload").href = url;
    $("#mergeDownload").dataset.blobUrl = url;
    // show preview without auto-downloading
    try {
      const pp = document.querySelector('#previewPanel'); if (pp) pp.style.display = 'block';
      const iframe = document.querySelector('#preview'); if (iframe) iframe.src = url;
    } catch (e) {}
    toast("Merged successfully. Click Download to save the file.");
    // clear list after merge
    mergeFilesList.length = 0; renderMergeList();
  } catch (err) {
    console.error(err);
    toast("Merge failed. Is every file a valid PDF?");
  }
});

/* ---- Split / Extract ---- */
$("#splitBtn").addEventListener("click", async () => {
  if (!ensurePdfLib()) return;
  const file = $("#splitFile").files?.[0];
  if (!file) return toast("Select a PDF.");
  const { PDFDocument } = PDFLib;
  try {
    const srcBytes = await file.arrayBuffer();
    const src = await PDFDocument.load(srcBytes);
    const total = src.getPageCount();
    const indices = parseRange($("#splitRange").value, total);
    if (!indices.length) return toast("No pages match that range.");
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    pages.forEach(p => out.addPage(p));
  const pdfBytes = await out.save();
  // revoke previous split URL if any
  try { const prev = $("#splitDownload").dataset?.blobUrl; if (prev) URL.revokeObjectURL(prev); } catch (e) {}
  const splitUrl = URL.createObjectURL(new Blob([pdfBytes], {type:"application/pdf"}));
  $("#splitDownload").style.display = "inline-flex";
  $("#splitDownload").href = splitUrl;
  $("#splitDownload").dataset.blobUrl = splitUrl;
  // show preview without auto-downloading
  try { const pp = document.querySelector('#previewPanel'); if (pp) pp.style.display = 'block'; const iframe = document.querySelector('#preview'); if (iframe) iframe.src = splitUrl; } catch (e) {}
    toast(`Extracted ${indices.length} page(s).`);
  } catch (err) {
    console.error(err);
    toast("Split failed. Check the page range.");
  }
});

// Revoke merge blob URL after user clicks the Download link to free memory and hide link
// Keep merge download link available after click so users can re-download the generated PDF.
// The old behavior revoked the blob URL and hid the link which prevented additional downloads.
// We now leave the blob URL intact; it will be revoked when a new merge is created (see merge handler).
document.querySelector('#mergeDownload')?.addEventListener('click', (e) => {
  try {
    const a = e.currentTarget;
    // Informational toast that the download started; do not revoke or hide here.
    setTimeout(() => { try { toast('Download started'); } catch (err) {} }, 120);
  } catch (err) { /* ignore */ }
});

/* ---- Watermark ---- */
$("#wmBtn").addEventListener("click", async () => {
  if (!ensurePdfLib()) return;
  const file = $("#wmFile").files?.[0];
  if (!file) return toast("Select a PDF.");
  const mode = document.querySelector('input[name="wmMode"]:checked')?.value || 'text';
  const text = $("#wmText").value || "CONFIDENTIAL";
  const size = parseFloat($("#wmSize").value) || 42;
  const opacity = Math.max(0, Math.min(1, parseFloat($("#wmOpacity").value) || 0.3));
  const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
  try {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
  const logoFile = $("#wmLogo").files?.[0];
  const rotation = parseFloat($("#wmRotate").value) || -45;
  const position = $("#wmPosition").value || 'center';
  const tile = !!$("#wmTile").checked;
    const n = doc.getPageCount();

    // Prepare either embedded image or font depending on selected mode
    let embeddedImage = null;
    let isPng = false;
    if (mode === 'logo' && logoFile) {
      const imgBytes = await logoFile.arrayBuffer();
      const mime = logoFile.type || '';
      if (mime.includes('png')) { embeddedImage = await doc.embedPng(imgBytes); isPng = true; }
      else { embeddedImage = await doc.embedJpg(imgBytes); }
    }
    if (mode === 'text' || !embeddedImage) {
      var font = await doc.embedFont(StandardFonts.HelveticaBold);
    }

    for (let i=0; i<n; i++) {
      const page = doc.getPage(i);
      const { width, height } = page.getSize();

  if (embeddedImage) {
        const imgSize = (typeof embeddedImage.size === 'function') ? embeddedImage.size() : { width: embeddedImage.width||300, height: embeddedImage.height||150 };
        const targetW = width * 0.4;
        const scale = targetW / imgSize.width;
        const targetH = imgSize.height * scale;

        const drawAt = (x,y) => page.drawImage(embeddedImage, { x, y, width: targetW, height: targetH, opacity });

        if (tile) {
          // tile across page with spacing
          const gapX = targetW * 0.5;
          const gapY = targetH * 0.5;
          for (let y = 0; y < height; y += targetH + gapY) {
            for (let x = 0; x < width; x += targetW + gapX) {
              drawAt(x, y);
            }
          }
        } else {
          let x, y;
          switch(position) {
            case 'top-left': x = 20; y = height - targetH - 20; break;
            case 'top-right': x = width - targetW - 20; y = height - targetH - 20; break;
            case 'bottom-left': x = 20; y = 20; break;
            case 'bottom-right': x = width - targetW - 20; y = 20; break;
            case 'center':
            default: x = (width - targetW)/2; y = (height - targetH)/2;
          }
          drawAt(x, y);
        }
  } else {
        const textWidth = font.widthOfTextAtSize(text, size);
        const txtW = textWidth;
        const txtH = size * 1.2;

        const drawTextAt = (x,y) => page.drawText(text, {
          x, y, size,
          font,
          rotate: degrees(rotation),
          color: rgb(0.6,0.6,0.6),
          opacity: opacity,
        });

        if (tile) {
          const gapX = txtW * 0.6;
          const gapY = txtH * 1.8;
          for (let y = 0; y < height + txtH; y += txtH + gapY) {
            for (let x = 0; x < width + txtW; x += txtW + gapX) {
              drawTextAt(x - txtW/2, y - txtH/2);
            }
          }
        } else {
          let x, y;
          switch(position) {
            case 'top-left': x = 20; y = height - txtH - 20; break;
            case 'top-right': x = width - txtW - 20; y = height - txtH - 20; break;
            case 'bottom-left': x = 20; y = 20; break;
            case 'bottom-right': x = width - txtW - 20; y = 20; break;
            case 'center':
            default: x = (width - txtW)/2; y = height * 0.5;
          }
          drawTextAt(x, y);
        }
      }
    }
  const outBytes = await doc.save();
  // revoke previous watermark URL if any
  try { const prev = $("#wmDownload").dataset?.blobUrl; if (prev) URL.revokeObjectURL(prev); } catch (e) {}
  const wmUrl = URL.createObjectURL(new Blob([outBytes], {type:"application/pdf"}));
  $("#wmDownload").style.display = "inline-flex";
  $("#wmDownload").href = wmUrl;
  $("#wmDownload").dataset.blobUrl = wmUrl;
  // show preview without auto-downloading
  try { const pp = document.querySelector('#previewPanel'); if (pp) pp.style.display = 'block'; const iframe = document.querySelector('#preview'); if (iframe) iframe.src = wmUrl; } catch (e) {}
    toast("Watermark added.");
  } catch (err) {
    console.error(err);
    toast("Watermark failed.");
  }
});

/* ---- Rotate ---- */
$("#rotBtn").addEventListener("click", async () => {
  if (!ensurePdfLib()) return;
  const file = $("#rotFile").files?.[0];
  if (!file) return toast("Select a PDF.");
  const deg = parseInt($("#rotDeg").value, 10) || 90;
  const range = $("#rotRange").value.trim();
  const { PDFDocument, degrees } = PDFLib;
  try {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const total = doc.getPageCount();
    const indices = parseRange(range || "all", total);
    indices.forEach(i => {
      const page = doc.getPage(i);
      page.setRotation(degrees(deg));
    });
  const outBytes = await doc.save();
  // revoke previous rotate URL if any
  try { const prev = $("#rotDownload").dataset?.blobUrl; if (prev) URL.revokeObjectURL(prev); } catch (e) {}
  const rotUrl = URL.createObjectURL(new Blob([outBytes], {type:"application/pdf"}));
  $("#rotDownload").style.display = "inline-flex";
  $("#rotDownload").href = rotUrl;
  $("#rotDownload").dataset.blobUrl = rotUrl;
  // show preview without auto-downloading
  try { const pp = document.querySelector('#previewPanel'); if (pp) pp.style.display = 'block'; const iframe = document.querySelector('#preview'); if (iframe) iframe.src = rotUrl; } catch (e) {}
    toast(`Rotated ${indices.length} page(s) by ${deg}°.`);
  } catch (err) {
    console.error(err);
    toast("Rotate failed.");
  }
});

// When a file is chosen for rotate, load it into the preview iframe and make the preview panel visible
document.querySelector('#rotFile')?.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  const pp = document.querySelector('#previewPanel');
  const iframe = document.querySelector('#preview');
  const rotDownload = document.querySelector('#rotDownload');
  if (f) {
    if (pp) pp.style.display = 'block';
    if (iframe) {
      try {
        const url = URL.createObjectURL(f);
        iframe.src = url;
        try { iframe.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) {}
      } catch (err) {
        console.warn('Failed to set preview src', err);
      }
    }
    if (rotDownload) rotDownload.style.display = 'none';
  } else {
    if (iframe) iframe.src = '';
  }
});

/* ---- Images -> PDF ---- */
$("#img2pdfBtn").addEventListener("click", async () => {
  if (!ensurePdfLib()) return;
  const files = $("#imgFiles").files;
  if (!files || !files.length) return toast("Select images.");
  const { PDFDocument } = PDFLib;
  try {
    const doc = await PDFDocument.create();
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const mime = file.type || "";
      let img;
      if (mime.includes("png")) {
        img = await doc.embedPng(bytes);
      } else {
        img = await doc.embedJpg(bytes);
      }

      // pdf-lib image objects expose width/height properties in
      // some versions and a size() method in others. Handle both.
      let width, height;
      if (typeof img.size === 'function') {
        const s = img.size();
        width = s.width; height = s.height;
      } else {
        width = img.width || 600;
        height = img.height || 800;
      }

      const page = doc.addPage([width, height]);
      page.drawImage(img, { x: 0, y: 0, width, height });
    }
  const outBytes = await doc.save();
  // revoke previous images->pdf URL if any
  try { const prev = $("#img2pdfDownload").dataset?.blobUrl; if (prev) URL.revokeObjectURL(prev); } catch (e) {}
  const img2pdfUrl = URL.createObjectURL(new Blob([outBytes], {type:"application/pdf"}));
  $("#img2pdfDownload").style.display = "inline-flex";
  $("#img2pdfDownload").href = img2pdfUrl;
  $("#img2pdfDownload").dataset.blobUrl = img2pdfUrl;
  // show preview without auto-downloading
  try { const pp = document.querySelector('#previewPanel'); if (pp) pp.style.display = 'block'; const iframe = document.querySelector('#preview'); if (iframe) iframe.src = img2pdfUrl; } catch (e) {}
    toast("Created PDF from images.");
  } catch (err) {
    console.error(err);
    toast("Conversion failed.");
  }
});

/* ---- PDF -> Word (.docx) ---- */
// Renders PDF pages using PDF.js and packs each page as a full-page image into a .docx
document.querySelector('#pdf2docBtn').addEventListener('click', async () => {
  // Ensure required libraries are available (try dynamic load if missing)
  console.info('PDF->Word invoked. Globals:', { pdfjsLib: !!window.pdfjsLib, docx: !!window.docx, Tesseract: !!window.Tesseract });
  console.info('Lib load info:', window.__libLoadInfo || null);
  try {
    await ensurePdfAndDocx();
  } catch (e) {
    toast('Required conversion libraries could not be loaded. Check your network or try reloading.');
    return;
  }
  const file = document.querySelector('#pdf2docFile').files?.[0];
  if (!file) return toast('Select a PDF.');

  // Ensure PDF.js is loaded; for docx we can fallback to a server-side converter if missing
  if (typeof window.pdfjsLib === 'undefined') {
    toast('PDF renderer (pdf.js) is missing.');
    return;
  }
  if (typeof window.docx === 'undefined' || !window.docx.Packer) {
    console.warn('docx not found in browser; attempting server-side conversion fallback');
    try {
      const form = new FormData();
      form.append('file', file, file.name || 'upload.pdf');
      // try localhost first
      let resp = null;
      try {
        resp = await fetch('http://localhost:8000/convert', { method: 'POST', body: form });
      } catch (e) {
        console.info('localhost:8000 not reachable, trying relative /server/convert');
      }
      if (!resp || !resp.ok) {
        try {
          resp = await fetch('/server/convert', { method: 'POST', body: form });
        } catch (e) { /* ignore */ }
      }
      if (resp && resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.querySelector('#pdf2docDownload');
        a.href = url; a.style.display = 'inline-flex'; a.download = (file.name.replace(/\.pdf$/i,'') || 'converted') + '.docx';
        toast('Server-side conversion complete.');
        return;
      }
      toast('Server-side conversion failed (no response).');
      return;
    } catch (e) {
      console.error('Server conversion failed', e);
      toast('Server-side conversion failed. See console.');
      return;
    }
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const { Document, Packer, Paragraph, ImageRun } = window.docx;
    const doc = new Document();

    // helper: render one page to a PNG dataURL
    async function renderPageToPng(pageNum) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      const renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
      return new Promise((resolve) => canvas.toBlob(blob => resolve(blob), 'image/png'));
    }

    // Determine pages to process from user range
    const totalPages = pdf.numPages;
    const rangeStr = (document.querySelector('#pdf2docRange')?.value || 'all').trim();
    const indices = parseRange(rangeStr, totalPages).map(i => i+1); // 1-based page numbers

    // UI helpers for progress
    const progressEl = document.querySelector('#pdf2docProgress');
    const progressBar = document.querySelector('#pdf2docProgressBar');
    const statusEl = document.querySelector('#pdf2docStatus');
    const setProgress = (pct, text) => { if (progressEl) { progressEl.style.display = 'block'; progressBar.style.width = pct + '%'; if (statusEl) statusEl.textContent = text || ''; } };

    // Try to extract selectable text from the selected pages with PDF.js
    let hasText = false;
    const pageTexts = [];
    for (let idx = 0; idx < indices.length; idx++) {
      const i = indices[idx];
      setProgress(Math.round((idx / indices.length) * 20), `Checking page ${i} of ${pdf.numPages} for text...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent().catch(() => null);
      if (textContent && textContent.items && textContent.items.length) {
        hasText = true;
        const pageText = textContent.items.map(it => it.str).join(' ');
        pageTexts.push(pageText);
      } else {
        pageTexts.push('');
      }
    }

    if (hasText) {
      // Build a .docx with extracted text per page as paragraphs
      for (let i = 0; i < pageTexts.length; i++) {
        const txt = pageTexts[i] || '';
        const paras = txt.split('\n').map(l => new Paragraph(l || ''));
        doc.addSection({ children: paras });
      }
    } else {
      // No selectable text found; fallback to OCR per page using Tesseract if available, otherwise embed images
      if (typeof window.Tesseract !== 'undefined') {
        const ocrLang = document.querySelector('#pdf2docLang')?.value || 'eng';
        for (let pi = 0; pi < indices.length; pi++) {
          const i = indices[pi];
          setProgress(20 + Math.round((pi / indices.length) * 60), `OCR page ${i} of ${pdf.numPages}...`);
          const blob = await renderPageToPng(i);
          const { data: { text } } = await window.Tesseract.recognize(await blob.arrayBuffer(), ocrLang);
          const paras = (text || '').split('\n').map(l => new Paragraph(l || ''));
          doc.addSection({ children: paras });
        }
      } else {
        // As a fallback, embed page images (existing behavior)
        for (let pi = 0; pi < indices.length; pi++) {
          const i = indices[pi];
          setProgress(20 + Math.round((pi / indices.length) * 60), `Rendering page ${i} of ${pdf.numPages}...`);
          const blob = await renderPageToPng(i);
          const buf = await blob.arrayBuffer();
          const img = new ImageRun({ data: buf, transformation: { width: 600, height: 800 } });
          const para = new Paragraph({ children: [ img ] });
          doc.addSection({ properties: {}, children: [ para ] });
        }
      }
    }

    setProgress(85, 'Packing .docx...');
    const packer = new Packer();
    const docBuf = await packer.toBuffer(doc);
    const blob = new Blob([docBuf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.querySelector('#pdf2docDownload');
    // revoke previous url if any
    try { const prev = a.dataset?.blobUrl; if (prev) URL.revokeObjectURL(prev); } catch (e) {}
    a.href = url; a.style.display = 'inline-flex';
    a.download = (file.name.replace(/\.pdf$/i,'') || 'converted') + '.docx';
    a.dataset.blobUrl = url;
    // preview first page image if available (do not auto-download)
    try {
      const firstBlob = await renderPageToPng(indices[0] || 1);
      // revoke previous preview used by pdf2doc if any and show image in iframe
      try { const prev = a.dataset?.previewUrl; if (prev) URL.revokeObjectURL(prev); } catch (e) {}
      const imgUrl = URL.createObjectURL(firstBlob);
      a.dataset.previewUrl = imgUrl;
      try { const pp = document.querySelector('#previewPanel'); if (pp) pp.style.display = 'block'; const iframe = document.querySelector('#preview'); if (iframe) iframe.src = imgUrl; } catch (e) {}
    } catch (e) { /* ignore preview failure */ }
    setProgress(100, 'Conversion complete.');
    setTimeout(() => { if (progressEl) progressEl.style.display = 'none'; }, 2000);
  } catch (err) {
    console.error(err);
    toast('PDF → Word conversion failed.');
  }
});

// Quick range buttons
document.querySelector('#pdf2docAll')?.addEventListener('click', () => {
  document.querySelector('#pdf2docRange').value = 'all';
});
document.querySelector('#pdf2docUseRange')?.addEventListener('click', () => {
  document.querySelector('#pdf2docRange').focus();
});
// 'Current' will set to page 1 by default; if preview shows page navigation later, this can be improved
document.querySelector('#pdf2docCurrent')?.addEventListener('click', () => {
  // Preview removed; default to page 1 for "Current"
  document.querySelector('#pdf2docRange').value = '1';
});

// Diagnostic: check PDF->Word pipeline
document.querySelector('#pdf2docDiag')?.addEventListener('click', async () => {
  console.info('Running PDF->Word diagnostic');
  const results = { pdfjs: !!window.pdfjsLib, docx: !!window.docx };
  try {
    await ensurePdfAndDocx();
    results.afterLoad = { pdfjs: !!window.pdfjsLib, docx: !!window.docx };
  } catch (e) {
    console.error('ensurePdfAndDocx failed', e);
    toast('Library load failed. See console.');
    return;
  }

  // Try a tiny PDF render test if pdfjs is present
  if (window.pdfjsLib) {
    try {
      // create a 1-page blank PDF in memory using pdf-lib and render first page
      if (window.PDFLib) {
        const { PDFDocument } = window.PDFLib;
        const doc = await PDFDocument.create();
        doc.addPage([100,100]);
        const bytes = await doc.save();
        const loading = await window.pdfjsLib.getDocument({ data: bytes }).promise;
        const p = await loading.getPage(1);
        results.pdfRender = !!p;
      } else {
        results.pdfRender = 'pdf-lib missing';
      }
    } catch (e) { results.pdfRender = 'error: '+(e && e.message); console.error(e); }
  }

  // Try a tiny docx pack test
  if (window.docx) {
    try {
      const { Document, Packer, Paragraph } = window.docx;
      const d = new Document({ sections: [{ children: [ new Paragraph('test') ] }] });
      const buf = await new Packer().toBuffer(d);
      results.docxPack = buf && buf.byteLength>0;
    } catch (e) { results.docxPack = 'error: '+(e && e.message); console.error(e); }
  }

  console.info('PDF->Word diagnostic results', results);
  toast(`Diag: pdfjs=${results.pdfjs?'ok':'no'}, docx=${results.docx?'ok':'no'}`);
});

// Watermark mode toggles (Text / Logo)
function updateWmModeUI() {
  const mode = document.querySelector('input[name="wmMode"]:checked')?.value || 'text';
  document.querySelector('#wmTextControls').style.display = (mode === 'text') ? 'block' : 'none';
  document.querySelector('#wmLogoControls').style.display = (mode === 'logo') ? 'block' : 'none';
}
document.querySelectorAll('input[name="wmMode"]').forEach(r => r.addEventListener('change', updateWmModeUI));
updateWmModeUI();

// Watermark preview (guarded) + validation
const wmPreviewCanvas = document.querySelector('#wmPreview');
const wmPreviewCtx = wmPreviewCanvas?.getContext && wmPreviewCanvas.getContext('2d');
let _wmPreviewPdf = null;
let _wmPreviewPdfTotal = 0;
let _wmPreviewCurrent = 1;
// store the last rendered base page image so overlays can be reapplied cleanly
let wmPreviewBaseImageData = null;
// track last created object URL for logo to revoke when replaced
let _wmLastLogoUrl = null;

async function renderWmPreview() {
  // guarded: ensure canvas present
  if (!wmPreviewCtx) return;
  // ensure pdf.js is loaded (try dynamic local vendor fallback)
  if (typeof window.pdfjsLib === 'undefined') {
    try {
      await loadScript('/vendor/pdf.min.js', 'pdfjsLib');
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
      }
    } catch (e) {
      console.info('pdf.js not available for watermark preview', e);
      return;
    }
  }
    // ensure the global preview panel is visible so watermark snapshots render into it
  const previewPanel = document.querySelector('#previewPanel'); if (previewPanel) previewPanel.style.display = 'block';
  // clear
  wmPreviewCtx.fillStyle = '#fff'; wmPreviewCtx.fillRect(0,0,wmPreviewCanvas.width, wmPreviewCanvas.height);
  const pdfFile = $('#wmFile').files?.[0];
  if (!pdfFile) {
    wmPreviewCtx.fillStyle = '#666'; wmPreviewCtx.fillText('Open a PDF to preview watermark', 10, 20);
    return;
  }
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    _wmPreviewPdf = pdf;
    _wmPreviewPdfTotal = pdf.numPages;
    _wmPreviewCurrent = 1;
    const totalEl = document.querySelector('#wmPreviewTotal');
    const pageNumEl = document.querySelector('#wmPreviewPageNum');
    if (totalEl) totalEl.textContent = `/ ${_wmPreviewPdfTotal}`;
    if (pageNumEl) pageNumEl.value = 1;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: wmPreviewCanvas.width / page.getViewport({scale:1}).width });
    await page.render({ canvasContext: wmPreviewCtx, viewport }).promise;
  // capture base rendered page image data so parameter-only updates can restore the page
  try { wmPreviewBaseImageData = wmPreviewCtx.getImageData(0,0, wmPreviewCanvas.width, wmPreviewCanvas.height); } catch (e) { wmPreviewBaseImageData = null; }
    overlayWmOnCanvas();
    // render the canvas into the main iframe preview as a blob URL so users see the watermarked page in the right column
    try {
      const iframe = document.querySelector('#preview');
      if (iframe) {
        if (iframe.src && iframe.src.startsWith('blob:')) { try { URL.revokeObjectURL(iframe.src); } catch (e) {} }
        const blob = await new Promise(res => wmPreviewCanvas.toBlob(res, 'image/png'));
        const url = URL.createObjectURL(blob);
        iframe.src = url;
        // remember this preview URL so resetPreview can revoke it
        const a = document.querySelector('#wmDownload');
        if (a) { try { if (a.dataset?.previewUrl) URL.revokeObjectURL(a.dataset.previewUrl); } catch (e) {} a.dataset.previewUrl = url; }
      }
    } catch (e) { console.warn('Failed to set watermark preview in iframe', e); }
  } catch (e) {
    console.error('Preview render failed', e);
  }
}

async function renderWmPreviewPage(pageNum) {
  if (!wmPreviewCtx || !_wmPreviewPdf) return;
  const num = Math.max(1, Math.min(_wmPreviewPdfTotal || 1, pageNum));
  _wmPreviewCurrent = num;
  const pageNumEl = document.querySelector('#wmPreviewPageNum');
  if (pageNumEl) pageNumEl.value = num;
  const page = await _wmPreviewPdf.getPage(num);
  const viewport = page.getViewport({ scale: wmPreviewCanvas.width / page.getViewport({scale:1}).width });
  await page.render({ canvasContext: wmPreviewCtx, viewport }).promise;
  // capture base page image after rendering
  try { wmPreviewBaseImageData = wmPreviewCtx.getImageData(0,0, wmPreviewCanvas.width, wmPreviewCanvas.height); } catch (e) { wmPreviewBaseImageData = null; }
  overlayWmOnCanvas();
}

async function overlayWmOnCanvas() {
  if (!wmPreviewCtx) return;
  if (!_wmPreviewPdf) {
    // clear canvas if there's no loaded preview PDF
    try { wmPreviewCtx.clearRect(0,0, wmPreviewCanvas.width, wmPreviewCanvas.height); } catch (e) {}
    return;
  }
  // restore the base rendered page image so overlays do not accumulate
  try {
    if (wmPreviewBaseImageData) {
      wmPreviewCtx.putImageData(wmPreviewBaseImageData, 0, 0);
    } else {
      wmPreviewCtx.clearRect(0,0, wmPreviewCanvas.width, wmPreviewCanvas.height);
    }
  } catch (e) {
    try { wmPreviewCtx.clearRect(0,0, wmPreviewCanvas.width, wmPreviewCanvas.height); } catch (ee) {}
  }
  const mode = document.querySelector('input[name="wmMode"]:checked')?.value || 'text';
  const opacity = Math.max(0, Math.min(1, parseFloat($('#wmOpacity').value) || 0.3));
  if (mode === 'logo') {
    const logoFile = $('#wmLogo').files?.[0];
    if (logoFile) {
      // draw logo only after it has loaded; await the load to ensure exported preview includes it
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            wmPreviewCtx.globalAlpha = opacity;
            const targetW = wmPreviewCanvas.width * 0.4;
            const scale = targetW / img.width;
            const targetH = img.height * scale;
            const x = (wmPreviewCanvas.width - targetW)/2;
            const y = (wmPreviewCanvas.height - targetH)/2;
            wmPreviewCtx.drawImage(img, x, y, targetW, targetH);
          } catch (e) { console.warn('Logo overlay draw failed', e); }
          wmPreviewCtx.globalAlpha = 1;
          // revoke previous logo URL if any
          try { if (_wmLastLogoUrl) { URL.revokeObjectURL(_wmLastLogoUrl); _wmLastLogoUrl = null; } } catch (e) {}
          // revoke the object URL used by this image after a short delay to ensure draw completed in some browsers
          try { setTimeout(() => { try { if (_wmLastLogoUrl) { URL.revokeObjectURL(_wmLastLogoUrl); _wmLastLogoUrl = null; } } catch(e){} }, 100); } catch(e){}
          resolve();
        };
        img.onerror = () => { resolve(); };
        try { if (_wmLastLogoUrl) { URL.revokeObjectURL(_wmLastLogoUrl); _wmLastLogoUrl = null; } } catch (e) {}
        try { _wmLastLogoUrl = URL.createObjectURL(logoFile); img.src = _wmLastLogoUrl; } catch (e) { img.src = ''; resolve(); }
      });
    }
  } else {
    const text = $('#wmText').value || 'CONFIDENTIAL';
    const rotation = parseFloat($('#wmRotate').value) || -45;
    wmPreviewCtx.save();
    wmPreviewCtx.globalAlpha = opacity;
    wmPreviewCtx.translate(wmPreviewCanvas.width/2, wmPreviewCanvas.height/2);
    wmPreviewCtx.rotate((rotation * Math.PI)/180);
    wmPreviewCtx.fillStyle = 'rgba(100,100,100,1)';
    wmPreviewCtx.font = `${parseFloat($('#wmSize').value)||42}px sans-serif`;
    wmPreviewCtx.textAlign = 'center';
    wmPreviewCtx.fillText(text, 0, 0);
    wmPreviewCtx.restore();
  }
  // update iframe preview to match canvas overlay in case the watermark parameters changed
  try {
    const iframe = document.querySelector('#preview');
    if (iframe && wmPreviewCanvas) {
      if (iframe.src && iframe.src.startsWith('blob:')) { try { URL.revokeObjectURL(iframe.src); } catch (e) {} }
      const blob = await new Promise(res => wmPreviewCanvas.toBlob(res, 'image/png'));
      try {
        const url = URL.createObjectURL(blob);
        iframe.src = url;
        const a = document.querySelector('#wmDownload');
        if (a) { try { if (a.dataset?.previewUrl) URL.revokeObjectURL(a.dataset.previewUrl); } catch (e) {} a.dataset.previewUrl = url; }
      } catch (e) { console.warn(e); }
    }
  } catch (e) { /* ignore preview update errors */ }
}

function validateWmInputs() {
  const mode = document.querySelector('input[name="wmMode"]:checked')?.value || 'text';
  const hasPdf = !!$('#wmFile').files?.length;
  let ok = hasPdf;
  if (mode === 'text') ok = ok && ($('#wmText').value || '').trim().length>0;
  if (mode === 'logo') ok = ok && !!$('#wmLogo').files?.length;
  const btn = document.querySelector('#wmBtn');
  if (btn) btn.disabled = !ok;
}

// Watermark input wiring:
// File inputs trigger a full PDF render; parameter changes update the canvas overlay quickly.
['#wmFile','#wmLogo'].forEach(sel => {
  document.querySelectorAll(sel).forEach(el => el.addEventListener('change', () => { validateWmInputs(); renderWmPreview().catch(()=>{}); }));
});
const paramSelectors = ['#wmText','#wmSize','#wmOpacity','#wmRotate','input[name="wmMode"]','#wmTile','#wmPosition'];
paramSelectors.forEach(sel => {
  document.querySelectorAll(sel).forEach(el => {
    const handler = () => {
      validateWmInputs();
      try {
        if (typeof _wmPreviewPdf !== 'undefined' && _wmPreviewPdf) {
          if (typeof overlayWmOnCanvas === 'function') overlayWmOnCanvas();
        } else {
          // no PDF loaded yet — render the preview (this will also apply overlays)
          if (typeof renderWmPreview === 'function') renderWmPreview().catch(()=>{});
        }
      } catch (e) { /* ignore */ }
    };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });
});
validateWmInputs();

// wire watermark navigation buttons if present
document.querySelector('#wmPrevPage')?.addEventListener('click', async () => { if (_wmPreviewPdf) await renderWmPreviewPage(_wmPreviewCurrent-1); });
document.querySelector('#wmNextPage')?.addEventListener('click', async () => { if (_wmPreviewPdf) await renderWmPreviewPage(_wmPreviewCurrent+1); });
document.querySelector('#wmPreviewPageNum')?.addEventListener('change', async (e) => { const v = parseInt(e.target.value,10)||1; if (_wmPreviewPdf) await renderWmPreviewPage(v); });

/* ---- Word -> PDF (.docx -> PDF) ---- */
document.querySelector('#doc2pdfBtn').addEventListener('click', async () => {
  const file = document.querySelector('#doc2pdfFile').files?.[0];
  if (!file) return toast('Select a .docx file.');

  toast('Uploading to server for conversion...');
  try {
    const form = new FormData();
    form.append('file', file, file.name || 'upload.docx');
    let resp = null;
    try {
      resp = await fetch('http://localhost:3000/convert/word-to-pdf', { method: 'POST', body: form });
    } catch (e) {
      console.info('localhost:3000 not reachable, trying relative /convert/word-to-pdf');
    }
    if (!resp || !resp.ok) {
      try {
        resp = await fetch('/convert/word-to-pdf', { method: 'POST', body: form });
      } catch (e) { /* ignore */ }
    }
    if (resp && resp.ok) {
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.querySelector('#doc2pdfDownload');
      // revoke previous url if any
      try { const prev = a.dataset?.blobUrl; if (prev) URL.revokeObjectURL(prev); } catch (e) {}
      a.href = url; a.style.display = 'inline-flex'; a.download = (file.name.replace(/\.docx$/i,'') || 'converted') + '.pdf';
      a.dataset.blobUrl = url;
      // show preview without auto-downloading
      try { const pp = document.querySelector('#previewPanel'); if (pp) pp.style.display = 'block'; const iframe = document.querySelector('#preview'); if (iframe) iframe.src = url; } catch (e) {}
      toast('Conversion complete.');
      return;
    }
    toast('Server conversion failed (no response).');
    return;
  } catch (e) {
    console.error('Server conversion failed', e);
    toast('Server-side conversion failed. See console.');
    return;
  }
});
