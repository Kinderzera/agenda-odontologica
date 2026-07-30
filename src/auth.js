import crypto from 'node:crypto';
import { sql } from './db.js';
import { senhaConfere } from './senha.js';

const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export const NOME_COOKIE = 'sessao';

export async function criarSessao(usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS);
  await sql.query('INSERT INTO sessoes (token, usuario_id, expira_em) VALUES ($1, $2, $3)', [
    token,
    usuarioId,
    expiraEm.toISOString(),
  ]);
  // aproveita para limpar sessões vencidas, sem precisar de um job separado
  await sql.query('DELETE FROM sessoes WHERE expira_em < now()');
  return token;
}

export async function usuarioDaSessao(token) {
  if (!token) return null;
  const linhas = await sql.query(
    `SELECT u.id, u.usuario, u.nome, u.admin
     FROM sessoes s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token = $1 AND s.expira_em > now()`,
    [token]
  );
  return linhas[0] ?? null;
}

export async function destruirSessao(token) {
  if (!token) return;
  await sql.query('DELETE FROM sessoes WHERE token = $1', [token]);
}

export function obterCookie(req, nome) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const parte of header.split(';')) {
    const idx = parte.indexOf('=');
    if (idx === -1) continue;
    const chave = parte.slice(0, idx).trim();
    if (chave === nome) return decodeURIComponent(parte.slice(idx + 1).trim());
  }
  return null;
}

function atributosCookie(valor) {
  const seguro = process.env.VERCEL ? '; Secure' : '';
  return `${NOME_COOKIE}=${valor}; HttpOnly; Path=/; SameSite=Lax${seguro}`;
}

// ---------- Handlers ----------

export async function login(req, res) {
  const { usuario = '', senha = '' } = req.json ?? {};
  const linhas = await sql.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario.trim()]);
  const registro = linhas[0];
  if (!registro || !senhaConfere(senha, registro.salt, registro.senha_hash)) {
    res.status = 401;
    res.body = { erro: 'Usuário ou senha inválidos.' };
    return;
  }
  const token = await criarSessao(registro.id);
  res.cookies = [`${atributosCookie(token)}; Max-Age=${DURACAO_SESSAO_MS / 1000}`];
  res.body = { id: registro.id, usuario: registro.usuario, nome: registro.nome, admin: registro.admin };
}

export async function logout(req, res) {
  if (req.token) await destruirSessao(req.token);
  res.cookies = [`${atributosCookie('')}; Max-Age=0`];
  res.status = 204;
}

export function me(req, res) {
  res.body = req.usuario;
}
