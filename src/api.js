import { sql } from './db.js';

function erro(res, status, mensagem) {
  res.status = status;
  res.body = { erro: mensagem };
}

function minutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function agendamentosConflitam(a, b) {
  const inicioA = minutos(a.hora_inicio);
  const fimA = inicioA + Number(a.duracao_min);
  const inicioB = minutos(b.hora_inicio);
  const fimB = inicioB + Number(b.duracao_min);
  return inicioA < fimB && inicioB < fimA;
}

// o Postgres devolve NUMERIC como string (evita perder precisão) — o
// front-end espera number, então normalizamos aqui antes de responder.
function comValorNumerico(linha) {
  if (!linha) return linha;
  return { ...linha, valor: Number(linha.valor) };
}

async function checarConflito({ id, profissional_id, data, hora_inicio, duracao_min }) {
  const doDia = await sql.query(
    `SELECT * FROM agendamentos
     WHERE data = $1 AND profissional_id = $2 AND status != 'cancelado' AND id != $3`,
    [data, profissional_id, id ?? -1]
  );
  const novo = { hora_inicio, duracao_min };
  return doDia.find((ag) => agendamentosConflitam(ag, novo));
}

async function checarBloqueio(profissional_id, data) {
  const linhas = await sql.query('SELECT * FROM bloqueios WHERE profissional_id = $1 AND data = $2', [
    profissional_id,
    data,
  ]);
  return linhas[0] ?? null;
}

// ---------- Profissionais ----------

export async function listarProfissionais(req, res) {
  res.body = await sql.query('SELECT * FROM profissionais WHERE ativo = true ORDER BY nome');
}

export async function criarProfissional(req, res) {
  const { nome, especialidade = '', cor = '#4f46e5' } = req.json ?? {};
  if (!nome || !nome.trim()) return erro(res, 400, 'Nome é obrigatório.');
  const linhas = await sql.query(
    'INSERT INTO profissionais (nome, especialidade, cor) VALUES ($1, $2, $3) RETURNING *',
    [nome.trim(), especialidade, cor]
  );
  res.status = 201;
  res.body = linhas[0];
}

export async function atualizarProfissional(req, res, params) {
  const id = Number(params.id);
  const existente = (await sql.query('SELECT * FROM profissionais WHERE id = $1', [id]))[0];
  if (!existente) return erro(res, 404, 'Profissional não encontrado.');
  const { nome, especialidade, cor } = req.json ?? {};
  const linhas = await sql.query(
    'UPDATE profissionais SET nome = $1, especialidade = $2, cor = $3 WHERE id = $4 RETURNING *',
    [nome ?? existente.nome, especialidade ?? existente.especialidade, cor ?? existente.cor, id]
  );
  res.body = linhas[0];
}

export async function removerProfissional(req, res, params) {
  const id = Number(params.id);
  const existente = (await sql.query('SELECT id FROM profissionais WHERE id = $1', [id]))[0];
  if (!existente) return erro(res, 404, 'Profissional não encontrado.');
  await sql.query('UPDATE profissionais SET ativo = false WHERE id = $1', [id]);
  res.status = 204;
}

// ---------- Pacientes ----------

export async function listarPacientes(req, res, params, query) {
  const busca = (query.busca ?? '').trim();
  if (busca) {
    res.body = await sql.query('SELECT * FROM pacientes WHERE nome ILIKE $1 OR telefone ILIKE $1 ORDER BY nome', [
      `%${busca}%`,
    ]);
  } else {
    res.body = await sql.query('SELECT * FROM pacientes ORDER BY nome');
  }
}

export async function obterPaciente(req, res, params) {
  const paciente = (await sql.query('SELECT * FROM pacientes WHERE id = $1', [Number(params.id)]))[0];
  if (!paciente) return erro(res, 404, 'Paciente não encontrado.');
  res.body = paciente;
}

export async function criarPaciente(req, res) {
  const {
    nome,
    telefone = '',
    email = '',
    data_nascimento = '',
    observacoes = '',
    tipo_atendimento = 'particular',
    convenio_nome = '',
  } = req.json ?? {};
  if (!nome || !nome.trim()) return erro(res, 400, 'Nome é obrigatório.');
  const linhas = await sql.query(
    `INSERT INTO pacientes (nome, telefone, email, data_nascimento, observacoes, tipo_atendimento, convenio_nome)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      nome.trim(),
      telefone,
      email,
      data_nascimento,
      observacoes,
      tipo_atendimento,
      tipo_atendimento === 'convenio' ? convenio_nome : '',
    ]
  );
  res.status = 201;
  res.body = linhas[0];
}

export async function atualizarPaciente(req, res, params) {
  const id = Number(params.id);
  const existente = (await sql.query('SELECT * FROM pacientes WHERE id = $1', [id]))[0];
  if (!existente) return erro(res, 404, 'Paciente não encontrado.');
  const dados = req.json ?? {};
  const tipoAtendimento = dados.tipo_atendimento ?? existente.tipo_atendimento;
  const linhas = await sql.query(
    `UPDATE pacientes SET nome = $1, telefone = $2, email = $3, data_nascimento = $4, observacoes = $5,
       tipo_atendimento = $6, convenio_nome = $7
     WHERE id = $8 RETURNING *`,
    [
      dados.nome ?? existente.nome,
      dados.telefone ?? existente.telefone,
      dados.email ?? existente.email,
      dados.data_nascimento ?? existente.data_nascimento,
      dados.observacoes ?? existente.observacoes,
      tipoAtendimento,
      tipoAtendimento === 'convenio' ? dados.convenio_nome ?? existente.convenio_nome : '',
      id,
    ]
  );
  res.body = linhas[0];
}

export async function removerPaciente(req, res, params) {
  const id = Number(params.id);
  const existente = (await sql.query('SELECT id FROM pacientes WHERE id = $1', [id]))[0];
  if (!existente) return erro(res, 404, 'Paciente não encontrado.');
  await sql.query('DELETE FROM pacientes WHERE id = $1', [id]);
  res.status = 204;
}

// ---------- Agendamentos ----------

const SELECT_AGENDAMENTO_JOIN = `
  SELECT a.*, p.nome AS paciente_nome, p.telefone AS paciente_telefone,
         p.tipo_atendimento AS paciente_tipo_atendimento, p.convenio_nome AS paciente_convenio_nome,
         pr.nome AS profissional_nome, pr.cor AS profissional_cor
  FROM agendamentos a
  JOIN pacientes p ON p.id = a.paciente_id
  JOIN profissionais pr ON pr.id = a.profissional_id
`;

export async function listarAgendamentos(req, res, params, query) {
  if (query.data) {
    const linhas = await sql.query(`${SELECT_AGENDAMENTO_JOIN} WHERE a.data = $1 ORDER BY a.hora_inicio`, [query.data]);
    res.body = linhas.map(comValorNumerico);
    return;
  }
  if (query.inicio && query.fim) {
    const linhas = await sql.query(
      `${SELECT_AGENDAMENTO_JOIN} WHERE a.data BETWEEN $1 AND $2 ORDER BY a.data, a.hora_inicio`,
      [query.inicio, query.fim]
    );
    res.body = linhas.map(comValorNumerico);
    return;
  }
  erro(res, 400, 'Informe "data" ou "inicio" e "fim".');
}

export async function criarAgendamento(req, res) {
  const {
    paciente_id,
    profissional_id,
    data,
    hora_inicio,
    duracao_min = 30,
    procedimento = '',
    valor = 0,
    observacoes = '',
    status = 'agendado',
  } = req.json ?? {};

  if (!paciente_id || !profissional_id || !data || !hora_inicio) {
    return erro(res, 400, 'paciente_id, profissional_id, data e hora_inicio são obrigatórios.');
  }

  const bloqueio = await checarBloqueio(profissional_id, data);
  if (bloqueio) {
    return erro(res, 409, `Este profissional está com o dia ${data} bloqueado${bloqueio.motivo ? ` (${bloqueio.motivo})` : ''}.`);
  }

  const conflito = await checarConflito({ profissional_id, data, hora_inicio, duracao_min });
  if (conflito) {
    return erro(
      res,
      409,
      `Conflito de horário: já existe um agendamento das ${conflito.hora_inicio} para este profissional.`
    );
  }

  const inseridos = await sql.query(
    `INSERT INTO agendamentos
      (paciente_id, profissional_id, data, hora_inicio, duracao_min, procedimento, valor, observacoes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [paciente_id, profissional_id, data, hora_inicio, duracao_min, procedimento, valor, observacoes, status]
  );

  res.status = 201;
  res.body = comValorNumerico((await sql.query(`${SELECT_AGENDAMENTO_JOIN} WHERE a.id = $1`, [inseridos[0].id]))[0]);
}

export async function atualizarAgendamento(req, res, params) {
  const id = Number(params.id);
  const existente = (await sql.query('SELECT * FROM agendamentos WHERE id = $1', [id]))[0];
  if (!existente) return erro(res, 404, 'Agendamento não encontrado.');
  const dados = req.json ?? {};

  const candidato = {
    id,
    paciente_id: dados.paciente_id ?? existente.paciente_id,
    profissional_id: dados.profissional_id ?? existente.profissional_id,
    data: dados.data ?? existente.data,
    hora_inicio: dados.hora_inicio ?? existente.hora_inicio,
    duracao_min: dados.duracao_min ?? existente.duracao_min,
  };

  const remarcado = candidato.data !== existente.data || candidato.profissional_id !== existente.profissional_id;

  if (dados.status !== 'cancelado') {
    if (remarcado) {
      const bloqueio = await checarBloqueio(candidato.profissional_id, candidato.data);
      if (bloqueio) {
        return erro(
          res,
          409,
          `Este profissional está com o dia ${candidato.data} bloqueado${bloqueio.motivo ? ` (${bloqueio.motivo})` : ''}.`
        );
      }
    }

    const conflito = await checarConflito(candidato);
    if (conflito) {
      return erro(
        res,
        409,
        `Conflito de horário: já existe um agendamento das ${conflito.hora_inicio} para este profissional.`
      );
    }
  }

  await sql.query(
    `UPDATE agendamentos SET
       paciente_id = $1, profissional_id = $2, data = $3, hora_inicio = $4, duracao_min = $5,
       procedimento = $6, valor = $7, observacoes = $8, status = $9
     WHERE id = $10`,
    [
      candidato.paciente_id,
      candidato.profissional_id,
      candidato.data,
      candidato.hora_inicio,
      candidato.duracao_min,
      dados.procedimento ?? existente.procedimento,
      dados.valor ?? existente.valor,
      dados.observacoes ?? existente.observacoes,
      dados.status ?? existente.status,
      id,
    ]
  );

  res.body = comValorNumerico((await sql.query(`${SELECT_AGENDAMENTO_JOIN} WHERE a.id = $1`, [id]))[0]);
}

export async function removerAgendamento(req, res, params) {
  const id = Number(params.id);
  const existente = (await sql.query('SELECT id FROM agendamentos WHERE id = $1', [id]))[0];
  if (!existente) return erro(res, 404, 'Agendamento não encontrado.');
  await sql.query('DELETE FROM agendamentos WHERE id = $1', [id]);
  res.status = 204;
}

// ---------- Bloqueios (dias indisponíveis) ----------

export async function listarBloqueios(req, res, params, query) {
  const { inicio, fim } = query;
  if (!inicio || !fim) return erro(res, 400, 'Informe "inicio" e "fim".');
  res.body = await sql.query(
    `SELECT b.*, pr.nome AS profissional_nome, pr.cor AS profissional_cor
     FROM bloqueios b
     JOIN profissionais pr ON pr.id = b.profissional_id
     WHERE b.data BETWEEN $1 AND $2
     ORDER BY b.data`,
    [inicio, fim]
  );
}

export async function criarBloqueio(req, res) {
  const { profissional_id, data, motivo = '' } = req.json ?? {};
  if (!profissional_id || !data) return erro(res, 400, 'profissional_id e data são obrigatórios.');

  const existente = await sql.query('SELECT id FROM bloqueios WHERE profissional_id = $1 AND data = $2', [
    profissional_id,
    data,
  ]);
  if (existente[0]) return erro(res, 409, 'Este dia já está bloqueado para este profissional.');

  const linhas = await sql.query(
    `INSERT INTO bloqueios (profissional_id, data, motivo) VALUES ($1, $2, $3) RETURNING *`,
    [profissional_id, data, motivo]
  );
  res.status = 201;
  res.body = linhas[0];
}

export async function removerBloqueio(req, res, params) {
  const id = Number(params.id);
  const existente = (await sql.query('SELECT id FROM bloqueios WHERE id = $1', [id]))[0];
  if (!existente) return erro(res, 404, 'Bloqueio não encontrado.');
  await sql.query('DELETE FROM bloqueios WHERE id = $1', [id]);
  res.status = 204;
}

// ---------- Fechamento (somente administrador) ----------

export async function listarFechamento(req, res, params, query) {
  const { inicio, fim } = query;
  if (!inicio || !fim) return erro(res, 400, 'Informe "inicio" e "fim".');

  const itens = await sql.query(
    `SELECT a.id, a.data, a.hora_inicio, a.procedimento, a.valor, a.status,
            p.nome AS paciente_nome, p.tipo_atendimento AS paciente_tipo_atendimento,
            p.convenio_nome AS paciente_convenio_nome,
            pr.id AS profissional_id, pr.nome AS profissional_nome, pr.cor AS profissional_cor
     FROM agendamentos a
     JOIN pacientes p ON p.id = a.paciente_id
     JOIN profissionais pr ON pr.id = a.profissional_id
     WHERE a.status = 'concluido' AND a.data BETWEEN $1 AND $2
     ORDER BY a.data, a.hora_inicio`,
    [inicio, fim]
  );

  const resumo = {
    quantidade: itens.length,
    totalGeral: 0,
    totalParticular: 0,
    totalConvenio: 0,
    porProfissional: [],
  };

  const profissionaisMap = new Map();

  for (const item of itens) {
    const valor = Number(item.valor);
    resumo.totalGeral += valor;
    if (item.paciente_tipo_atendimento === 'convenio') {
      resumo.totalConvenio += valor;
    } else {
      resumo.totalParticular += valor;
    }

    if (!profissionaisMap.has(item.profissional_id)) {
      profissionaisMap.set(item.profissional_id, {
        profissional_id: item.profissional_id,
        profissional_nome: item.profissional_nome,
        profissional_cor: item.profissional_cor,
        quantidade: 0,
        total: 0,
      });
    }
    const p = profissionaisMap.get(item.profissional_id);
    p.quantidade += 1;
    p.total += valor;
  }

  resumo.porProfissional = [...profissionaisMap.values()].sort((a, b) => b.total - a.total);

  res.body = { itens: itens.map(comValorNumerico), resumo };
}
