# Clínica Odontológica Jacupiranga — Agenda

Sistema de agendamento para a Clínica Odontológica Jacupiranga. Feito para
rodar no Vercel, com banco de dados Postgres na nuvem — acessível de
qualquer lugar, não só na rede Wi-Fi de casa.

## Como funciona

- **Backend**: Node.js (funções serverless no Vercel; `http` puro localmente).
- **Frontend**: HTML/CSS/JS puro, responsivo (funciona em computador e celular).
- **Banco de dados**: Postgres (Neon), conectado ao projeto pelo painel do
  Vercel — os dados ficam na nuvem, com backup e conexão criptografada.
- **Sessão de login**: guardada numa tabela no próprio banco (não se perde
  se o servidor reiniciar, e dá pra derrubar uma sessão específica).

## Publicar no Vercel (primeira vez)

Alguns passos só o dono da conta consegue fazer (não tenho acesso ao seu
GitHub/Vercel):

1. **Criar um repositório no GitHub** (vazio) para este projeto.
2. Direto desta pasta, me avise para eu conectar o remoto e dar `git push`
   (o commit inicial já está pronto localmente).
3. No painel do **Vercel** → "Add New Project" → importar esse repositório.
4. Ainda no painel do Vercel, aba **Storage** → criar um banco **Postgres**
   e conectar a este projeto. Isso injeta a variável `DATABASE_URL`
   automaticamente — não precisa configurar nada manualmente.
5. (Opcional, recomendado) Antes do primeiro deploy, adicione a variável de
   ambiente `ADMIN_SENHA_INICIAL` no projeto do Vercel com a senha que você
   quiser para o login `admin`. Se pular esse passo, o sistema gera uma
   senha aleatória forte e mostra nos **Logs** do Vercel (Deployments → a
   última → Logs) — só aparece essa vez, guarde na hora.
6. Deploy automático a partir daí. Atualizações futuras: só `git push`.

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
- Domínio próprio no Vercel (ex.: agenda.clinicajacupiranga.com.br) em vez
  do endereço padrão `*.vercel.app`.
