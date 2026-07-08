// Solo aceptamos dominios reales de TikTok (incluye enlaces cortos vm./vt.)
// Esto evita que la API se use como proxy genérico para cualquier web.
const TIKTOK_DOMAIN_REGEX = /^https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\//i;

function isValidTikTokUrl(url) {
  if (typeof url !== 'string') return false;
  return TIKTOK_DOMAIN_REGEX.test(url.trim());
}

module.exports = { isValidTikTokUrl };
