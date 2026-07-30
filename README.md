# Clínica Odontológica Jacupiranga — Agenda

Sistema de agendamento para a Clínica Odontológica Jacupiranga. Roda
localmente na sua máquina e é acessível também pelo celular (mesma rede Wi-Fi).

## Como funciona

- **Backend**: Node.js puro (sem dependências de terceiros) usando o módulo
  `node:sqlite` embutido no Node — não precisa de `npm install`.
- **Frontend**: HTML/CSS/JS puro, responsivo (funciona em computador e celular).
- **Banco de dados**: arquivo local em `data/agenda.db` (criado automaticamente
  no primeiro uso).

## Como iniciar

Dê duplo clique no atalho **"Agenda Odontologica"** na Área de Trabalho.

Isso sobe o servidor em segundo plano (sem abrir janela de terminal) e já
abre a agenda no navegador sozinho, em `http://localhost:3000`. Não precisa
mexer em terminal nenhum.

O servidor fica rodando escondido em segundo plano — pode fechar a aba do
navegador e reabrir quando quiser (`http://localhost:3000`) que ele continua
no ar. Se reiniciar o computador, é só clicar no atalho de novo.

Para acessar pelo **celular**, com o celular na mesma rede Wi-Fi deste
computador, abra no navegador do celular o endereço `http://SEU-IP:3000`
(esse IP aparece se você abrir o arquivo `iniciar.bat` — veja abaixo).

<details>
<summary>Modo avançado / diagnóstico (com terminal)</summary>

Se precisar ver os logs do servidor ou descobrir o IP para acesso pelo
celular, dê duplo clique em `iniciar.bat` em vez do atalho — ele abre um
terminal mostrando os endereços disponíveis. Feche a janela para parar essa
instância do servidor.

</details>

## Login

Login padrão criado automaticamente na primeira execução:

- **Usuário:** `admin`
- **Senha:** `admin123`

Recomendado trocar depois (por enquanto a troca de senha precisa ser feita
direto no banco — posso adicionar uma tela para isso quando quiser).

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
- Publicar online (ex.: Vercel) quando quiser acesso fora da rede local —
  nesse caso o banco SQLite local precisaria trocar por um banco na nuvem.

## Observação sobre a pasta

Esta pasta está dentro do OneDrive (Área de Trabalho sincronizada). Isso é ok
para os arquivos de código, mas o arquivo de banco de dados (`data/agenda.db`)
fica mudando toda hora enquanto o sistema é usado — o OneDrive vai tentar
sincronizá-lo constantemente. Se notar lentidão ou conflitos de sincronização,
me avise que a gente move a pasta `data/` para fora do OneDrive.
