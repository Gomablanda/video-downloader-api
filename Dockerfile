FROM node:20-slim

# ffmpeg + yt-dlp (descargador de vídeo) y ghostscript (compresor de PDF)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 python3-pip curl ghostscript && \
    pip3 install --break-system-packages -U yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
