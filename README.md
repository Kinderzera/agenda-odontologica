# Clínica Odontológica Jacupiranga — Agenda

Sistema de agendamento para a Clínica Odontológica Jacupiranga. No ar em
**https://agendaodontologica.vercel.app** — acessível de qualquer lugar,
não só na rede Wi-Fi de casa. Repositório:
`github.com/Kinderzera/agenda-odontologica`.

## Como funciona

- **Backend**: Node.js (funções serverless no Vercel; `http` puro localmente).
- **Frontend**: HTML/CSS/JS puro, responsivo (funciona em computador e celular).
- **Banco de dados**: Postgres (Neon), conectado ao projeto pelo painel do
  Vercel — os dados ficam na nuvem, com backup e conexão criptografada.
- **Sessão de login**: guardada numa tabela no próprio banco (não se perde
  se o servidor reiniciar, e dá pra derrubar uma sessão específica).

## Deploy

Já publicado — projeto `agenda-odontologica` no Vercel (workspace "Sobras
Reoperação", conta GitHub `Kinderzera`), com banco Postgres (Neon)
conectado. Atualizações futuras: só `git push` na branch `main`, o Vercel
faz o deploy automático.

Se a senha do `admin` não foi definida via `ADMIN_SENHA_INICIAL` antes do
banco ser criado, ela foi gerada automaticamente e mostrada uma única vez
nos **Logs** do Vercel (procure por "Usuário administrador criado").

## Rodar localmente (para testar antes de publicar)

Como o banco agora é na nuvem, mesmo rodando local o app precisa da conexão
com o Postgres:

1. Instale a [Vercel CLI](https://vercel.com/docs/cli) (já instalada aqui) e
   rode `vercel login` uma vez.
2. Na pasta do projeto: `vercel link` (conecta esta pasta ao projeto no
   Vercel) e depois `vercel env pull .env.local` (baixa a `DATABASE_URL`
   real para um arquivo local — nunca vai pro GitHub, já está no
   `.gitignore`).
3. Dê duplo clique no atalho **"Agenda Odontologica"** na Área de Trabalho
   (ou rode `npm start`). Abre sozinho em `http://localhost:3000`.

Sem o `.env.local` preenchido, o atalho avisa o que falta em vez de travar
sem explicação.

## Segurança

- Senhas de usuário: hash com `scrypt` + salt único por pessoa (nunca fica
  em texto puro em lugar nenhum).
- Sessão: token aleatório de 32 bytes, cookie `HttpOnly` (não acessível por
  JavaScript), `Secure` quando publicado (só trafega por HTTPS), expira em
  30 dias ou no logout.
- Conexão com o banco: criptografada (TLS), string de conexão nunca vai pro
  repositório — sempre por variável de ambiente.
- Aba **Fechamento** (valores dos atendimentos): bloqueada tanto na tela
  quanto na API para quem não é administrador.

## Login

- **Usuário:** `admin`
- **Senha:** definida em `ADMIN_SENHA_INICIAL` no deploy, ou gerada
  automaticamente e mostrada uma única vez nos logs (veja acima).

## O que já está pronto

- Tela de login (usuário/senha com sessão), identidade visual escura/azul.
- Cadastro de profissionais (dentistas), com cor própria na agenda.
- Cadastro de pacientes (nome, telefone, e-mail, data de nascimento,
  particular ou convênio, observações).
- Agenda em calendário mensal, com detalhe do dia (horários, pacientes e
  procedimentos) ao clicar.
- Criação de agendamento com valor do procedimento e verificação automática
  de conflito de horário.
- Edição de status do agendamento (agendado, confirmado, concluído, cancelado, faltou).
- **Fechamento** (visível só para login administrador): totais do mês —
  geral, particular, convênio e por profissional — com a lista de todos os
  atendimentos concluídos e seus valores.

## Administrador x usuário comum

Hoje só existe o login `admin`, que é administrador (único com acesso à
aba Fechamento). Se no futuro quiser um login separado para a recepção
(sem ver os valores/fechamento), me avise — dá para criar um usuário sem
a permissão de administrador; só falta uma tela para cadastrar esse
segundo usuário pela interface (por enquanto seria direto no banco).

## Próximos passos possíveis

- Histórico de atendimentos por paciente (prontuário simples).
- Tela para gerenciar usuários (criar login da recepção, trocar senha).
- Lembretes automáticos (WhatsApp/SMS) — exigiria integração externa.
- Domínio próprio (ex.: agenda.clinicajacupiranga.com.br) em vez do
  `*.vercel.app`.
