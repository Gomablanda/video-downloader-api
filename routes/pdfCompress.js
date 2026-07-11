const express = require('express');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { compressPdf } = require('../services/pdfCompressor');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

function cleanupDir(dir) {
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

router.post('/pdf-compress', (req, res) => {
  upload.single('pdf')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const message = uploadErr.code === 'LIMIT_FILE_SIZE'
        ? 'El PDF es demasiado grande (máximo 25MB).'
        : 'No se pudo recibir el archivo.';
      return res.status(400).json({ error: message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se ha recibido ningún archivo PDF.' });
    }

    const workDir = path.join(os.tmpdir(), 'comeletras-pdf-' + crypto.randomUUID());
    fs.mkdirSync(workDir, { recursive: true });

    const inputPath = path.join(workDir, 'original.pdf');
    const outputPath = path.join(workDir, 'comprimido.pdf');

    try {
      fs.writeFileSync(inputPath, req.file.buffer);

      await compressPdf(inputPath, outputPath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="comeletras-comprimido.pdf"');
      res.setHeader('X-Original-Size', fs.statSync(inputPath).size);
      res.setHeader('X-Compressed-Size', fs.statSync(outputPath).size);
      res.setHeader('Access-Control-Expose-Headers', 'X-Original-Size, X-Compressed-Size');

      const stream = fs.createReadStream(outputPath);

      stream.on('error', (streamErr) => {
        console.error('Error leyendo el PDF comprimido:', streamErr);
        cleanupDir(workDir);
        if (!res.headersSent) {
          res.status(502).json({ error: 'No se pudo procesar este PDF. Inténtalo de nuevo.' });
        } else {
          res.end();
        }
      });

      stream.pipe(res);
      stream.on('close', () => cleanupDir(workDir));
      res.on('close', () => cleanupDir(workDir));

    } catch (err) {
      console.error(err);
      cleanupDir(workDir);
      res.status(502).json({ error: 'No se pudo comprimir este PDF. Puede que esté dañado o protegido con contraseña.' });
    }
  });
});

module.exports = router;
