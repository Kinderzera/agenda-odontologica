import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { gerarSalt, hashSenha, senhaConfere } from './senha.js';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    'Defina a variável de ambiente DATABASE_URL (ou POSTGRES_URL) com a string de conexão do Postgres.'
  );
}

// sql.query(texto, parametros) executa uma query parametrizada e devolve as linhas
// diretamente (array de objetos) — sem wrapper .rows como no driver `pg`.
export const sql = neon(connectionString);

await sql.query(`
  CREATE TABLE IF NOT EXISTS profissionais (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    especialidade TEXT,
    cor TEXT NOT NULL DEFAULT '#4f46e5',
    ativo BOOLEAN NOT NULL DEFAULT true
  )
`);

await sql.query(`
  CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    data_nascimento TEXT,
    observacoes TEXT,
    tipo_atendimento TEXT NOT NULL DEFAULT 'particular',
    convenio_nome TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

await sql.query(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    profissional_id INTEGER NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    duracao_min INTEGER NOT NULL DEFAULT 30,
    procedimento TEXT,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'agendado',
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

await sql.query('CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data)');

await sql.query(`
  CREATE TABLE IF NOT EXISTS bloqueios (
    id SERIAL PRIMARY KEY,
    profissional_id INTEGER NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    motivo TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (profissional_id, data)
  )
`);

await sql.query('CREATE INDEX IF NOT EXISTS idx_bloqueios_data ON bloqueios(data)');

await sql.query(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    salt TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    admin BOOLEAN NOT NULL DEFAULT false,
    pode_ver_fechamento BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

await sql.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pode_ver_fechamento BOOLEAN NOT NULL DEFAULT false');

await sql.query(`
  CREATE TABLE IF NOT EXISTS sessoes (
    token TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expira_em TIMESTAMPTZ NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

// ---------- Seed inicial (banco novo) ----------

const [{ n: temProfissional }] = await sql.query('SELECT COUNT(*)::int AS n FROM profissionais');
if (temProfissional === 0) {
  await sql.query('INSERT INTO profissionais (nome, especialidade, cor) VALUES ($1, $2, $3)', [
    'Dra. Mayra Silva',
    'Cirurgiã-Dentista',
    '#38bdf8',
  ]);
}

const [{ n: temUsuario }] = await sql.query('SELECT COUNT(*)::int AS n FROM usuarios');
if (temUsuario === 0) {
  const salt = gerarSalt();
  const senhaInicial = process.env.ADMIN_SENHA_INICIAL || crypto.randomBytes(9).toString('base64url');

  await sql.query('INSERT INTO usuarios (usuario, nome, salt, senha_hash, admin) VALUES ($1, $2, $3, $4, true)', [
    'admin',
    'Administrador',
    salt,
    hashSenha(senhaInicial, salt),
  ]);

  console.log('');
  console.log('  Usuário administrador criado -> login: admin');
  if (process.env.ADMIN_SENHA_INICIAL) {
    console.log('  Senha: a definida em ADMIN_SENHA_INICIAL.');
  } else {
    console.log(`  Senha gerada automaticamente: ${senhaInicial}`);
    console.log('  Guarde essa senha agora — ela só aparece aqui, nos logs, uma vez.');
  }
  console.log('');
} else if (process.env.ADMIN_SENHA_INICIAL) {
  // Usuário admin já existe: se ADMIN_SENHA_INICIAL foi definida/alterada,
  // sincroniza a senha dele com o valor da variável (permite redefinir a
  // senha só trocando essa env var e fazendo redeploy).
  const [admin] = await sql.query("SELECT * FROM usuarios WHERE usuario = 'admin'");
  if (admin && !senhaConfere(process.env.ADMIN_SENHA_INICIAL, admin.salt, admin.senha_hash)) {
    const novoSalt = gerarSalt();
    await sql.query('UPDATE usuarios SET salt = $1, senha_hash = $2 WHERE id = $3', [
      novoSalt,
      hashSenha(process.env.ADMIN_SENHA_INICIAL, novoSalt),
      admin.id,
    ]);
    console.log('');
    console.log('  Senha do usuário admin atualizada a partir de ADMIN_SENHA_INICIAL.');
    console.log('');
  }
}
