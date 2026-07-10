const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { isValidTikTokUrl } = require('../utils/validateUrl');
const { getVideoInfo, downloadOriginalVideo } = require('../services/extractor');
const { convertToIphoneCompatible } = require('../services/converter');

const router = express.Router();

router.post('/info', async (req, res) => {
  const { url } = req.body;

  if (!isValidTikTokUrl(url)) {
    return res.status(400).json({ error: 'La URL no parece ser un enlace válido de TikTok.' });
  }

  try {
    const info = await getVideoInfo(url);
    res.json(info);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'No se pudo obtener información de este vídeo. Puede que ya no esté disponible.' });
  }
});

router.post('/download', async (req, res) => {
  const { url, noAudio } = req.body;
  const t0 = Date.now();
  const log = (msg) => console.log(`[download +${Date.now() - t0}ms] ${msg}`);

  if (!isValidTikTokUrl(url)) {
    return res.status(400).json({ error: 'La URL no parece ser un enlace válido de TikTok.' });
  }

  const workDir = path.join(os.tmpdir(), 'comeletras-' + crypto.randomUUID());
  fs.mkdirSync(workDir, { recursive: true });

  const finalPath = path.join(workDir, 'comeletras-tiktok.mp4');

  try {
    log('Empieza descarga con yt-dlp');
    const originalPath = await downloadOriginalVideo(url, workDir);
    log(`Descarga terminada: ${originalPath}`);

    log('Empieza conversión con ffmpeg');
    await convertToIphoneCompatible(originalPath, finalPath, { noAudio: !!noAudio });
    const existsRightAfter = fs.existsSync(finalPath);
    const sizeRightAfter = existsRightAfter ? fs.statSync(finalPath).size : 0;
    log(`Conversión terminada. Archivo existe: ${existsRightAfter}, tamaño: ${sizeRightAfter} bytes`);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="comeletras-tiktok.mp4"');

    log('Justo antes de abrir el stream de lectura');
    const existsBeforeStream = fs.existsSync(finalPath);
    log(`¿Sigue existiendo justo antes de leer?: ${existsBeforeStream}`);

    const stream = fs.createReadStream(finalPath);

    stream.on('error', (streamErr) => {
      log(`ERROR leyendo el archivo final: ${streamErr.message}`);
      cleanupDir(workDir);
      if (!res.headersSent) {
        res.status(502).json({ error: 'No se pudo procesar este vídeo. Inténtalo de nuevo en unos segundos.' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);

    stream.on('close', () => { log('Stream cerrado, limpiando carpeta temporal'); cleanupDir(workDir); });
    res.on('close', () => { log('Respuesta cerrada, limpiando carpeta temporal'); cleanupDir(workDir); });

  } catch (err) {
    log(`ERROR en el proceso general: ${err.message}`);
    cleanupDir(workDir);
    res.status(502).json({ error: 'No se pudo procesar este vídeo. Inténtalo de nuevo en unos segundos.' });
  }
});

function cleanupDir(dir) {
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

module.exports = router;
