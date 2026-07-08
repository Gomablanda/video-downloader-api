const { spawn } = require('child_process');

/**
 * Convierte cualquier vídeo de entrada a MP4 (H.264 + AAC + faststart),
 * el formato que la app Fotos de iPhone importa y reproduce sin problemas.
 * Validado manualmente: descarga → Chrome iOS → compartir → Fotos → funciona.
 */
function convertToIphoneCompatible(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',                    // sobrescribe si ya existe
      '-i', inputPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',   // compatibilidad máxima de color
      '-movflags', '+faststart', // metadata al inicio del archivo (clave para Fotos/streaming)
      outputPath
    ];

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
