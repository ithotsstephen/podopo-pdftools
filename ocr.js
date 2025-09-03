// OCR helper module (exposes window.OCR)
(function(){
  async function loadScript(src, globalName, timeout = 20000) {
    if (globalName && window[globalName]) return;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      const t = setTimeout(() => reject(new Error('timeout loading ' + src)), timeout);
      s.onload = () => { clearTimeout(t); resolve(); };
      s.onerror = (e) => { clearTimeout(t); reject(e || new Error('failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  async function ensureTesseract() {
    if (window.Tesseract) return;
    // try CDN then local vendor
    const candidates = [
      'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js',
      'https://unpkg.com/tesseract.js@2.1.5/dist/tesseract.min.js',
      '/vendor/tesseract.min.js'
    ];
    let ok = false;
    for (const c of candidates) {
      try { await loadScript(c, 'Tesseract', 20000); ok = true; break; } catch (e) { console.warn('tesseract load failed', c, e); }
    }
    if (!ok) throw new Error('Tesseract failed to load');
  }

  // Render pages from a PDF ArrayBuffer to PNG blobs using pdfjsLib
  async function renderPdfPagesToBlobs(arrayBuffer, indices, scale = 2) {
    if (typeof window.pdfjsLib === 'undefined') throw new Error('pdfjsLib not available');
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const out = [];
    for (let i=0;i<indices.length;i++) {
      const pageNum = indices[i];
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
      out.push({ page: pageNum, blob });
    }
    return out;
  }

  // Recognize a single Blob (image) and return text. Accepts an optional progress callback.
  async function recognizeBlob(blob, lang = 'eng', onProgress) {
    await ensureTesseract();
    // prefer worker API when available
    if (window.Tesseract && window.Tesseract.createWorker) {
      const worker = window.Tesseract.createWorker({ logger: (m) => onProgress && onProgress(m) });
      try {
        await worker.load();
        await worker.loadLanguage(lang);
        await worker.initialize(lang);
        const { data: { text } } = await worker.recognize(await blob.arrayBuffer());
        return text || '';
      } finally {
        await worker.terminate();
      }
    }
    // fallback to old API
    if (window.Tesseract && window.Tesseract.recognize) {
      const res = await window.Tesseract.recognize(await blob.arrayBuffer(), lang, { logger: m => onProgress && onProgress(m) });
      return res?.data?.text || '';
    }
    throw new Error('Tesseract API not found');
  }

  // Recognize array of {page, blob} entries sequentially and return combined text
  async function recognizeBlobs(pages, lang = 'eng', onProgress) {
    let out = '';
    for (let i=0;i<pages.length;i++) {
      const p = pages[i];
      onProgress && onProgress({ status: 'render', page: p.page, index: i, total: pages.length });
      const text = await recognizeBlob(p.blob, lang, (m) => onProgress && onProgress(Object.assign({ page: p.page, index: i }, m)));
      out += `\n\n--- Page ${p.page} ---\n\n` + (text || '');
      onProgress && onProgress({ status: 'done', page: p.page, index: i, total: pages.length });
    }
    return out.trim();
  }

  // Diagnostic check
  async function check() {
    const res = { pdfjsLib: !!window.pdfjsLib, Tesseract: !!window.Tesseract, OCR: true };
    try { if (!window.Tesseract) await ensureTesseract(); res.Tesseract = !!window.Tesseract; } catch (e) { res.Tesseract = false; res.err = e.message; }
    return res;
  }

  window.OCR = {
    ensureTesseract,
    renderPdfPagesToBlobs,
    recognizeBlob,
    recognizeBlobs
  , check
  };
})();
