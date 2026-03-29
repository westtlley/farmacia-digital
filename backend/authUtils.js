import crypto from 'crypto';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, admin) {
  if (!password || !admin?.password_hash || !admin?.password_salt) {
    return false;
  }

  const { hash } = hashPassword(password, admin.password_salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(admin.password_hash, 'hex'));
}
