const { spawn } = require('child_process');
const fs = require('fs');

function compressPdf(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    const gs = spawn('gs', args);

    let stderr = '';
    gs.stderr.on('data', (chunk) => { stderr += chunk; });

    gs.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Ghostscript falló (código ${code}): ${stderr.slice(-500)}`));
      }
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        return reject(new Error(`Ghostscript terminó con código 0 pero no generó el archivo. stderr: ${stderr.slice(-500)}`));
      }
      resolve(outputPath);
    });

    gs.on('error', (err) => {
      reject(new Error('No se pudo ejecutar Ghostscript. ¿Está instalado? ' + err.message));
    });
  });
}

module.exports = { compressPdf };
