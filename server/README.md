# PDF → DOCX Converter (FastAPI)

This small server provides a `/convert` endpoint that accepts a single PDF upload and returns a `.docx` converted using `pdf2docx`.

Requirements

- Python 3.9+

Install

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Usage (curl)

```bash
curl -F "file=@/path/to/file.pdf" http://localhost:8000/convert --output converted.docx
```

Notes

- `pdf2docx` does a best-effort conversion and may not preserve complex layouts perfectly. It is free and suitable for many scanned or text PDFs.
- For production, add authentication and file size limits.
