# Comeletras Tools — API del descargador de TikTok

Backend Node.js + Express que usa yt-dlp (extracción sin marca de agua) y
ffmpeg (conversión a H.264+AAC, compatible con la app Fotos de iPhone).

## Requisitos (ya los tienes instalados en el Mac)

- Node.js 18+
- yt-dlp
- ffmpeg

## Puesta en marcha en local

```bash
cd video-downloader-api
npm install
npm start
```

El servidor arranca en `http://localhost:3000`.

## Probar sin frontend (con curl)

**1. Comprobar que está vivo:**
```bash
curl http://localhost:3000/health
```

**2. Pedir información de un vídeo (rápido, no descarga nada):**
```bash
curl -X POST http://localhost:3000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vm.tiktok.com/TU_ENLACE/"}'
```

**3. Descargar el vídeo ya convertido:**
```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vm.tiktok.com/TU_ENLACE/"}' \
  --output video.mp4
```

Si `video.mp4` se abre bien y pesa varios MB, todo el pipeline funciona.

## Notas

- Los archivos temporales se guardan en una carpeta única por petición dentro
  de `/tmp` y se borran automáticamente al terminar la descarga.
- CORS está restringido a los orígenes definidos en `ALLOWED_ORIGINS`
  (por defecto, solo `localhost:8080` para el frontend en desarrollo).
  En producción habrá que añadir `https://comeletras.com`.
