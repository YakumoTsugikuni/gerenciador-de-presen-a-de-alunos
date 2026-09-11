const crypto = require('crypto');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET precisa ser configurado em producao.');
}

const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

module.exports = { jwtSecret };