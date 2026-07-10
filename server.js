const express = require('express');
const cors = require('cors');
const downloadRoutes = require('./routes/download');

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada (el servidor sigue vivo):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada sin capturar (el servidor sigue vivo):', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// En local aceptamos peticiones desde Eleventy (localhost:8080) y desde
// la web real. En producción, restringir SOLO a comeletras.com.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:8080,http://127.0.0.1:8080'
).split(',');

app.use(cors({
  origin: function (origin, callback) {
    // Permite peticiones sin origin (ej. curl, Postman) útiles en pruebas locales
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false); // origen no permitido: se bloquea sin lanzar error 500
    }
  }
}));

app.use(express.json());

// Health check — útil para comprobar que el servidor (local o Render) está vivo
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', downloadRoutes);

app.listen(PORT, () => {
  console.log(`Comeletras Tools API escuchando en http://localhost:${PORT}`);
});
