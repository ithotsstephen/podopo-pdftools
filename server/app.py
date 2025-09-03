from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import tempfile
import os
from pdf2docx import Converter

app = FastAPI(title='PDF→DOCX Converter')

# Allow the frontend dev server origin (adjust as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get('/health')
def health():
    return {"status": "ok"}


@app.post('/convert')
async def convert_pdf_to_docx(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail='Only PDF files are supported')

    # Save uploaded PDF to a temp file
    tmp_dir = tempfile.mkdtemp(prefix='pdf2docx-')
    in_path = os.path.join(tmp_dir, 'input.pdf')
    out_path = os.path.join(tmp_dir, 'output.docx')
    try:
        with open(in_path, 'wb') as f:
            shutil.copyfileobj(file.file, f)

        # Convert using pdf2docx
        conv = Converter(in_path)
        try:
            conv.convert(out_path, start=0, end=None)
        finally:
            conv.close()

        if not os.path.exists(out_path):
            raise HTTPException(status_code=500, detail='Conversion failed')

        # Return the generated docx
        return FileResponse(out_path, filename=os.path.splitext(file.filename)[0] + '.docx', media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    finally:
        try:
            # cleanup will be handled by system temp cleanup; remove files
            file.file.close()
        except Exception:
            pass
