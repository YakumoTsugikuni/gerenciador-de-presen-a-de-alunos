const crypto = require('crypto');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET precisa ser configurado em producao.');
}

const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const authCookieName = 'auth_token';

function getToken(req) {
  const authorization = req.headers.authorization || '';
  if (authorization.startsWith('Bearer ')) return authorization.slice(7);
  const cookies = req.headers.cookie ? req.headers.cookie.split(';') : [];
  const cookie = cookies.find(value => value.trim().startsWith(`${authCookieName}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(authCookieName.length + 1)) : null;
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${authCookieName}=${encodeURIComponent(token)}; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${authCookieName}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

module.exports = { jwtSecret, getToken, setAuthCookie, clearAuthCookie };