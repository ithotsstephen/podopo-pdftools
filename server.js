// server.js
const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/convert/word-to-pdf", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  const filePath = path.resolve(req.file.path);
  const outputDir = path.dirname(filePath);
  exec(`libreoffice --headless --convert-to pdf "${filePath}" --outdir "${outputDir}"`, (err, stdout, stderr) => {
    if (err) {
      console.error("LibreOffice conversion error:", err, stderr);
      return res.status(500).send("Conversion failed");
    }
    // Find the output PDF
    const pdfName = req.file.originalname.replace(/\.[^.]+$/, ".pdf");
    const pdfPath = path.join(outputDir, pdfName);
    fs.readFile(pdfPath, (err, data) => {
      if (err) {
        console.error("PDF read error:", err);
        return res.status(500).send("PDF not found");
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=\"${pdfName}\"`);
      res.send(data);
      // Cleanup
      fs.unlink(filePath, () => {});
      fs.unlink(pdfPath, () => {});
    });
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
