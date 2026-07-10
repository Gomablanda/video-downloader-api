const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { isValidTikTokUrl } = require('../utils/validateUrl');
const { getVideoInfo, downloadOriginalVideo } = require('../services/extractor');
const { convertToIphoneCompatible } = require('../services/converter');

const router = express.Router();

/**
 * POST /api/info
 * Body: { url }
 * Devuelve metadatos del vídeo (miniatura, duración, resolución...) SIN descargarlo.
 * Es el paso rápido que alimenta la vista previa en el frontend.
 */
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

/**
 * POST /api/download
 * Body: { url }
 * Descarga el vídeo original, lo convierte a H.264+AAC compatible con iPhone,
 * y lo devuelve como archivo adjunto (streaming).
 */
router.post('/download', async (req, res) => {
  const { url, noAudio } = req.body;

  if (!isValidTikTokUrl(url)) {
    return res.status(400).json({ error: 'La URL no parece ser un enlace válido de TikTok.' });
  }

  // Carpeta temporal única por petición, para no mezclar archivos entre usuarios
  const workDir = path.join(os.tmpdir(), 'comeletras-' + crypto.randomUUID());
  fs.mkdirSync(workDir, { recursive: true });

  const finalPath = path.join(workDir, 'comeletras-tiktok.mp4');

  try {
      const originalPath = await downloadOriginalVideo(url, workDir);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="comeletras-tiktok.mp4"');

    const stream = fs.createReadStream(finalPath);
    stream.pipe(res);

    // Limpieza de archivos temporales cuando termina el envío (éxito o corte de conexión)
    stream.on('close', () => cleanupDir(workDir));
    res.on('close', () => cleanupDir(workDir));

  } catch (err) {
    console.error(err);
    cleanupDir(workDir);
    res.status(502).json({ error: 'No se pudo procesar este vídeo. Inténtalo de nuevo en unos segundos.' });
  }
});

function cleanupDir(dir) {
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

module.exports = router;
