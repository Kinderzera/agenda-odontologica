import crypto from 'node:crypto';

export function gerarSalt() {
  return crypto.randomBytes(16).toString('hex');
}

export function hashSenha(senha, salt) {
  return crypto.scryptSync(senha, salt, 64).toString('hex');
}

export function senhaConfere(senha, salt, hashEsperado) {
  const calculado = Buffer.from(hashSenha(senha, salt), 'hex');
  const esperado = Buffer.from(hashEsperado, 'hex');
  if (calculado.length !== esperado.length) return false;
  return crypto.timingSafeEqual(calculado, esperado);
}
