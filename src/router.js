import * as api from './api.js';
import * as auth from './auth.js';

const rotasPublicas = [{ metodo: 'POST', padrao: /^\/api\/login$/, fn: auth.login }];

const rotas = [
  { metodo: 'POST', padrao: /^\/api\/logout$/, fn: auth.logout },
  { metodo: 'GET', padrao: /^\/api\/me$/, fn: auth.me },

  { metodo: 'GET', padrao: /^\/api\/profissionais$/, fn: api.listarProfissionais },
  { metodo: 'POST', padrao: /^\/api\/profissionais$/, fn: api.criarProfissional },
  { metodo: 'PUT', padrao: /^\/api\/profissionais\/(?<id>\d+)$/, fn: api.atualizarProfissional },
  { metodo: 'DELETE', padrao: /^\/api\/profissionais\/(?<id>\d+)$/, fn: api.removerProfissional },

  { metodo: 'GET', padrao: /^\/api\/pacientes$/, fn: api.listarPacientes },
  { metodo: 'POST', padrao: /^\/api\/pacientes$/, fn: api.criarPaciente },
  { metodo: 'GET', padrao: /^\/api\/pacientes\/(?<id>\d+)$/, fn: api.obterPaciente },
  { metodo: 'PUT', padrao: /^\/api\/pacientes\/(?<id>\d+)$/, fn: api.atualizarPaciente },
  { metodo: 'DELETE', padrao: /^\/api\/pacientes\/(?<id>\d+)$/, fn: api.removerPaciente },

  { metodo: 'GET', padrao: /^\/api\/agendamentos$/, fn: api.listarAgendamentos },
  { metodo: 'POST', padrao: /^\/api\/agendamentos$/, fn: api.criarAgendamento },
  { metodo: 'PUT', padrao: /^\/api\/agendamentos\/(?<id>\d+)$/, fn: api.atualizarAgendamento },
  { metodo: 'DELETE', padrao: /^\/api\/agendamentos\/(?<id>\d+)$/, fn: api.removerAgendamento },

  { metodo: 'GET', padrao: /^\/api\/fechamento$/, fn: api.listarFechamento },

  { metodo: 'GET', padrao: /^\/api\/bloqueios$/, fn: api.listarBloqueios },
  { metodo: 'POST', padrao: /^\/api\/bloqueios$/, fn: api.criarBloqueio },
  { metodo: 'DELETE', padrao: /^\/api\/bloqueios\/(?<id>\d+)$/, fn: api.removerBloqueio },

  { metodo: 'GET', padrao: /^\/api\/usuarios$/, fn: api.listarUsuarios, admin: true },
  { metodo: 'POST', padrao: /^\/api\/usuarios$/, fn: api.criarUsuario, admin: true },
  { metodo: 'PUT', padrao: /^\/api\/usuarios\/(?<id>\d+)$/, fn: api.atualizarUsuario, admin: true },
  { metodo: 'DELETE', padrao: /^\/api\/usuarios\/(?<id>\d+)$/, fn: api.removerUsuario, admin: true },
];

async function lerCorpo(req) {
  // No Vercel, a runtime Node já entrega req.body pronto (parseado a partir
  // do JSON enviado). Localmente (http.createServer puro) isso não existe
  // ainda, então lemos o stream cru — as duas formas precisam funcionar.
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return undefined;
      }
    }
    return req.body;
  }

  const partes = [];
  for await (const chunk of req) partes.push(chunk);
  if (partes.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8'));
  } catch {
    return undefined;
  }
}

// Trata qualquer requisição de /api/*. Funciona tanto com o http.createServer
// local (servidor-local.js) quanto com uma serverless function do Vercel — os dois
// usam objetos req/res compatíveis com o Node `http`.
export async function tratarRequisicao(req, res) {
  const url = new URL(req.url, 'http://localhost');

  const rotaPublica = rotasPublicas.find((r) => r.metodo === req.method && r.padrao.test(url.pathname));
  const rota = rotaPublica || rotas.find((r) => r.metodo === req.method && r.padrao.test(url.pathname));
  if (!rota) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ erro: 'Rota não encontrada.' }));
  }

  const match = url.pathname.match(rota.padrao);
  const params = match.groups || {};
  const query = Object.fromEntries(url.searchParams);

  const reqCtx = { json: ['POST', 'PUT', 'PATCH'].includes(req.method) ? await lerCorpo(req) : undefined };
  const resCtx = { status: 200, body: null, cookies: undefined };

  if (!rotaPublica) {
    const token = auth.obterCookie(req, auth.NOME_COOKIE);
    const usuario = await auth.usuarioDaSessao(token);
    if (!usuario) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ erro: 'Não autenticado.' }));
    }
    if (rota.admin && !usuario.admin) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ erro: 'Acesso restrito ao administrador.' }));
    }
    reqCtx.usuario = usuario;
    reqCtx.token = token;
  }

  try {
    await rota.fn(reqCtx, resCtx, params, query);
  } catch (e) {
    console.error(e);
    resCtx.status = 500;
    resCtx.body = { erro: 'Erro interno do servidor.' };
  }

  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (resCtx.cookies) headers['Set-Cookie'] = resCtx.cookies;
  res.writeHead(resCtx.status, headers);
  res.end(resCtx.body === null ? '' : JSON.stringify(resCtx.body));
}
