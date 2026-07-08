const { spawn } = require('child_process');

/**
 * Consulta con ffprobe el códec de vídeo real del archivo descargado.
 * Nos permite decidir si hace falta recodificar o basta con remuxar.
 */
function getVideoCodec(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'csv=p=0',
      inputPath
    ];
    const ffprobe = spawn('ffprobe', args);

    let stdout = '';
    ffprobe.stdout.on('data', (chunk) => { stdout += chunk; });
    ffprobe.on('close', (code) => {
      if (code !== 0) return reject(new Error('ffprobe no pudo leer el archivo'));
      resolve(stdout.trim());
    });
    ffprobe.on('error', (err) => reject(err));
  });
}

/**
 * Convierte el vídeo a MP4 compatible con Fotos de iPhone (H.264 + AAC).
 *
 * Optimizado para memoria limitada (plan gratuito de Render, 512MB):
 * - Si el vídeo ya es H.264, solo se "remuxea" (copia el stream de vídeo
 *   tal cual, sin recodificar) — coste de memoria casi nulo.
 * - Si no lo es (p.ej. bytevc1 de TikTok), se recodifica con ajustes
 *   pensados para consumir poca memoria: preset rápido y un solo hilo.
 */
async function convertToIphoneCompatible(inputPath, outputPath) {
  let videoCodec;
  try {
    videoCodec = await getVideoCodec(inputPath);
  } catch (err) {
    videoCodec = 'unknown'; // si falla la detección, recodificamos por seguridad
  }

  const needsReencode = videoCodec !== 'h264';

  const args = needsReencode
    ? [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-threads', '1',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outputPath
      ]
    : [
        '-y',
        '-i', inputPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        outputPath
      ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';
    ffmpeg.stderr.on('data', (chunk) => { stderr += chunk; });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffmpeg falló en la conversión (código ${code}): ${stderr.slice(-500)}`));
      }
      resolve(outputPath);
    });

    ffmpeg.on('error', (err) => {
      reject(new Error('No se pudo ejecutar ffmpeg. ¿Está instalado? ' + err.message));
    });
  });
}

module.exports = { convertToIphoneCompatible };
