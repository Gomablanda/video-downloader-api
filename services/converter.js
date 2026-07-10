const { spawn } = require('child_process');

function getVideoCodec(inputPath) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', inputPath];
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

async function convertToIphoneCompatible(inputPath, outputPath, options = {}) {
  const { noAudio = false } = options;

  let videoCodec;
  try {
    videoCodec = await getVideoCodec(inputPath);
  } catch (err) {
    videoCodec = 'unknown';
  }

  const needsReencode = videoCodec !== 'h264';
  const audioArgs = noAudio ? ['-an'] : ['-c:a', 'aac'];
  const videoArgs = needsReencode
    ? ['-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-pix_fmt', 'yuv420p']
    : ['-c:v', 'copy'];

  const args = ['-y', '-i', inputPath, ...videoArgs, ...audioArgs, '-movflags', '+faststart', outputPath];

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
