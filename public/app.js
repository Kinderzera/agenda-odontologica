// ---------- API ----------

async function api(metodo, caminho, corpo) {
  const resp = await fetch(caminho, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resp.status === 401 && caminho !== '/api/login' && caminho !== '/api/me') {
    mostrarLogin();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  if (resp.status === 204) return null;
  const dados = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(dados?.erro || 'Erro inesperado.');
  return dados;
}

// ---------- Estado ----------

const estado = {
  view: 'agenda',
  data: new Date(),
  profissionais: [],
  pacientes: [],
  filtroProfissionalId: null,
  buscaPaciente: '',
  usuario: null,
  fechamentoData: new Date(),
};

function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function paraISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatarDataLonga(date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// ---------- Autenticação ----------

const telaLogin = document.getElementById('tela-login');
const appShell = document.getElementById('app-shell');
const formLogin = document.getElementById('form-login');
const nomeUsuarioEl = document.getElementById('nome-usuario');

function mostrarLogin() {
  appShell.hidden = true;
  telaLogin.hidden = false;
}

async function mostrarApp(usuario) {
  telaLogin.hidden = true;
  appShell.hidden = false;
  estado.usuario = usuario;
  nomeUsuarioEl.textContent = usuario.nome;
  document.getElementById('tab-fechamento').hidden = !usuario.admin;
  await carregarBase();
  await render();
}

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const antigo = formLogin.querySelector('.mensagem-erro');
  if (antigo) antigo.remove();
  const dados = Object.fromEntries(new FormData(formLogin).entries());
  try {
    const usuario = await api('POST', '/api/login', dados);
    formLogin.reset();
    await mostrarApp(usuario);
  } catch (err) {
    formLogin.prepend(elMensagemErro(err.message));
  }
});

document.getElementById('btn-mostrar-senha').addEventListener('click', () => {
  const campo = document.getElementById('campo-senha');
  campo.type = campo.type === 'password' ? 'text' : 'password';
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await api('POST', '/api/logout');
  mostrarLogin();
});

// ---------- Bootstrap ----------

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tabs__btn');
  if (!btn) return;
  document.querySelectorAll('.tabs__btn').forEach((b) => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  estado.view = btn.dataset.view;
  render();
});

async function carregarBase() {
  estado.profissionais = await api('GET', '/api/profissionais');
  estado.pacientes = await api('GET', '/api/pacientes');
}

async function render() {
  if (estado.view === 'agenda') return renderAgenda();
  if (estado.view === 'pacientes') return renderPacientes();
  if (estado.view === 'profissionais') return renderProfissionais();
  if (estado.view === 'fechamento') return renderFechamento();
}

// ---------- Modal genérico ----------

function fecharModal() {
  modalRoot.innerHTML = '';
}

function abrirModal(tituloHtml, conteudoEl) {
  modalRoot.innerHTML = '';
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.addEventListener('click', (e) => {
    if (e.target === fundo) fecharModal();
  });

  const modal = document.createElement('div');
  modal.className = 'modal';
  const titulo = document.createElement('h2');
  titulo.className = 'modal__titulo';
  titulo.innerHTML = tituloHtml;
  modal.appendChild(titulo);
  modal.appendChild(conteudoEl);

  fundo.appendChild(modal);
  modalRoot.appendChild(fundo);
}

function elMensagemErro(texto) {
  const div = document.createElement('div');
  div.className = 'mensagem-erro';
  div.textContent = texto;
  return div;
}

// ================= AGENDA =================

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function nomeMesAno(date) {
  const texto = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function gerarCelulasMes(date) {
  const primeiro = new Date(date.getFullYear(), date.getMonth(), 1);
  const ultimo = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const inicioGrade = new Date(primeiro);
  inicioGrade.setDate(inicioGrade.getDate() - primeiro.getDay());
  const fimGrade = new Date(ultimo);
  fimGrade.setDate(fimGrade.getDate() + (6 - ultimo.getDay()));

  const celulas = [];
  const cursor = new Date(inicioGrade);
  while (cursor <= fimGrade) {
    celulas.push({ data: new Date(cursor), foraDoMes: cursor.getMonth() !== date.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }
  return celulas;
}

async function renderAgenda() {
  app.innerHTML = '';

  const nav = document.createElement('div');
  nav.className = 'agenda__nav';
  nav.innerHTML = `
    <div class="agenda__data">${nomeMesAno(estado.data)}</div>
    <div class="agenda__nav-btns">
      <button class="btn" id="btn-anterior">‹ Mês anterior</button>
      <button class="btn" id="btn-hoje">Hoje</button>
      <button class="btn" id="btn-proximo">Próximo mês ›</button>
      <button class="btn btn--primary" id="btn-novo-agendamento">+ Agendar</button>
    </div>
  `;
  app.appendChild(nav);
  nav.querySelector('#btn-anterior').onclick = () => {
    estado.data = new Date(estado.data.getFullYear(), estado.data.getMonth() - 1, 1);
    renderAgenda();
  };
  nav.querySelector('#btn-proximo').onclick = () => {
    estado.data = new Date(estado.data.getFullYear(), estado.data.getMonth() + 1, 1);
    renderAgenda();
  };
  nav.querySelector('#btn-hoje').onclick = () => {
    estado.data = new Date();
    renderAgenda();
  };
  nav.querySelector('#btn-novo-agendamento').onclick = () => abrirModalAgendamento(null, null, paraISO(new Date()));

  const filtro = document.createElement('div');
  filtro.className = 'filtro-profissional';
  const chipTodos = criarChipProfissional(null, 'Todos', '#9fb3c8');
  filtro.appendChild(chipTodos);
  for (const p of estado.profissionais) {
    filtro.appendChild(criarChipProfissional(p.id, p.nome, p.cor));
  }
  app.appendChild(filtro);

  if (estado.profissionais.length === 0) {
    app.appendChild(criarVazio('Cadastre um profissional na aba "Profissionais" para começar a agendar.'));
    return;
  }

  const celulas = gerarCelulasMes(estado.data);
  const inicioISO = paraISO(celulas[0].data);
  const fimISO = paraISO(celulas[celulas.length - 1].data);
  let agendamentosMes = await api('GET', `/api/agendamentos?inicio=${inicioISO}&fim=${fimISO}`);
  if (estado.filtroProfissionalId) {
    agendamentosMes = agendamentosMes.filter((a) => a.profissional_id === estado.filtroProfissionalId);
  }

  const porDia = new Map();
  for (const ag of agendamentosMes) {
    if (!porDia.has(ag.data)) porDia.set(ag.data, []);
    porDia.get(ag.data).push(ag);
  }

  const calendario = document.createElement('div');
  calendario.className = 'calendario-mes';

  for (const nomeDia of DIAS_SEMANA) {
    const cab = document.createElement('div');
    cab.className = 'calendario-mes__cabecalho';
    cab.textContent = nomeDia;
    calendario.appendChild(cab);
  }

  const hojeISO = paraISO(new Date());

  for (const celula of celulas) {
    const iso = paraISO(celula.data);
    const agsDoDia = (porDia.get(iso) || []).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

    const diaEl = document.createElement('div');
    diaEl.className =
      'dia-mes' + (celula.foraDoMes ? ' dia-mes--fora' : '') + (iso === hojeISO ? ' dia-mes--hoje' : '');

    const numero = document.createElement('div');
    numero.className = 'dia-mes__numero';
    numero.textContent = celula.data.getDate();
    diaEl.appendChild(numero);

    if (agsDoDia.length > 0) {
      const pontos = document.createElement('div');
      pontos.className = 'dia-mes__pontos';
      const coresUnicas = [...new Set(agsDoDia.map((a) => a.profissional_cor))].slice(0, 4);
      for (const cor of coresUnicas) {
        const ponto = document.createElement('span');
        ponto.className = 'dia-mes__ponto';
        ponto.style.background = cor;
        pontos.appendChild(ponto);
      }
      diaEl.appendChild(pontos);

      const contagem = document.createElement('div');
      contagem.className = 'dia-mes__contagem';
      contagem.textContent = agsDoDia.length === 1 ? '1 consulta' : `${agsDoDia.length} consultas`;
      diaEl.appendChild(contagem);
    }

    diaEl.onclick = () => abrirModalDiaDetalhe(iso, agsDoDia);
    calendario.appendChild(diaEl);
  }

  app.appendChild(calendario);
}

function criarChipProfissional(id, nome, cor) {
  const chip = document.createElement('button');
  chip.className = 'chip-profissional' + (estado.filtroProfissionalId === id ? ' is-active' : '');
  chip.style.color = cor;
  chip.innerHTML = `<span class="chip-dot" style="background:${cor}"></span>${nome}`;
  chip.onclick = () => {
    estado.filtroProfissionalId = id;
    renderAgenda();
  };
  return chip;
}

function abrirModalDiaDetalhe(dataISO, agendamentosDoDia) {
  const container = document.createElement('div');

  const cabecalho = document.createElement('div');
  cabecalho.className = 'dia-detalhe__cabecalho';
  cabecalho.innerHTML = `<button class="btn btn--primary btn--sm" id="btn-agendar-neste-dia">+ Agendar neste dia</button>`;
  container.appendChild(cabecalho);

  const lista = document.createElement('div');
  lista.className = 'dia-detalhe__lista';

  if (agendamentosDoDia.length === 0) {
    lista.appendChild(criarVazio('Nenhum agendamento neste dia.'));
  } else {
    for (const ag of agendamentosDoDia) {
      const item = document.createElement('div');
      item.className = 'dia-detalhe__item';
      item.style.borderLeftColor = ag.profissional_cor || '#22aad4';
      const ehConvenio = ag.paciente_tipo_atendimento === 'convenio';
      item.innerHTML = `
        <div class="dia-detalhe__hora">
          <span>${ag.hora_inicio.slice(0, 5)}</span>
          <small>${ag.duracao_min}min</small>
        </div>
        <div class="dia-detalhe__info">
          <div class="dia-detalhe__paciente">${escapeHtml(ag.paciente_nome)}</div>
          <div class="dia-detalhe__meta">${escapeHtml(ag.procedimento || 'Sem procedimento definido')} · ${escapeHtml(ag.profissional_nome)}</div>
          <div class="dia-detalhe__meta">
            ${ag.valor ? formatarMoeda(ag.valor) + ' · ' : ''}${ehConvenio ? 'Convênio' + (ag.paciente_convenio_nome ? ' (' + escapeHtml(ag.paciente_convenio_nome) + ')' : '') : 'Particular'}
          </div>
        </div>
        <span class="badge badge-${ag.status}">${STATUS_LABEL[ag.status]}</span>
      `;
      item.onclick = () => abrirModalAgendamento(ag);
      lista.appendChild(item);
    }
  }
  container.appendChild(lista);

  abrirModal(`Agenda de ${formatarDataLonga(new Date(dataISO + 'T00:00:00'))}`, container);

  container.querySelector('#btn-agendar-neste-dia').onclick = () => {
    abrirModalAgendamento(null, null, dataISO);
  };
}

function criarVazio(texto) {
  const div = document.createElement('div');
  div.className = 'vazio';
  div.textContent = texto;
  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------- Modal de agendamento ----------

const STATUS_LABEL = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
};

function abrirModalAgendamento(agendamento = null, horaSugerida = null, dataSugerida = null) {
  const editando = !!agendamento;
  const form = document.createElement('form');

  const opcoesProfissionais = estado.profissionais
    .map(
      (p) =>
        `<option value="${p.id}" ${agendamento?.profissional_id === p.id ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`
    )
    .join('');

  const opcoesPacientes = estado.pacientes
    .map(
      (p) =>
        `<option value="${p.id}" ${agendamento?.paciente_id === p.id ? 'selected' : ''}>${escapeHtml(p.nome)}${p.telefone ? ' — ' + escapeHtml(p.telefone) : ''}</option>`
    )
    .join('');

  const opcoesStatus = Object.entries(STATUS_LABEL)
    .map(([v, label]) => `<option value="${v}" ${agendamento?.status === v ? 'selected' : ''}>${label}</option>`)
    .join('');

  form.innerHTML = `
    <div class="campo">
      <label>Paciente</label>
      <select name="paciente_id" required>
        <option value="">Selecione...</option>
        ${opcoesPacientes}
      </select>
    </div>
    <div class="campo">
      <button type="button" class="btn btn--sm" id="btn-novo-paciente-inline">+ Novo paciente</button>
    </div>
    <div class="campo">
      <label>Profissional</label>
      <select name="profissional_id" required>${opcoesProfissionais}</select>
    </div>
    <div class="linha-campos">
      <div class="campo">
        <label>Data</label>
        <input type="date" name="data" value="${agendamento?.data || dataSugerida || paraISO(new Date())}" required />
      </div>
      <div class="campo">
        <label>Hora</label>
        <input type="time" name="hora_inicio" value="${agendamento?.hora_inicio?.slice(0, 5) || horaSugerida || '08:00'}" required />
      </div>
    </div>
    <div class="linha-campos">
      <div class="campo">
        <label>Duração (min)</label>
        <input type="number" name="duracao_min" min="10" step="10" value="${agendamento?.duracao_min || 30}" required />
      </div>
      ${
        editando
          ? `<div class="campo"><label>Status</label><select name="status">${opcoesStatus}</select></div>`
          : ''
      }
    </div>
    <div class="linha-campos">
      <div class="campo">
        <label>Procedimento</label>
        <input type="text" name="procedimento" value="${escapeHtml(agendamento?.procedimento || '')}" placeholder="Ex: Limpeza, Canal, Avaliação..." />
      </div>
      <div class="campo">
        <label>Valor (R$)</label>
        <input type="number" name="valor" min="0" step="0.01" value="${agendamento?.valor ?? 0}" />
      </div>
    </div>
    <div class="campo">
      <label>Observações</label>
      <textarea name="observacoes">${escapeHtml(agendamento?.observacoes || '')}</textarea>
    </div>
    <div class="modal__acoes">
      ${editando ? '<button type="button" class="btn btn--perigo" id="btn-excluir">Excluir</button>' : ''}
      <button type="button" class="btn" id="btn-cancelar-modal">Fechar</button>
      <button type="submit" class="btn btn--primary">${editando ? 'Salvar' : 'Agendar'}</button>
    </div>
  `;

  abrirModal(editando ? 'Editar agendamento' : 'Novo agendamento', form);

  form.querySelector('#btn-cancelar-modal').onclick = fecharModal;

  form.querySelector('#btn-novo-paciente-inline').onclick = () => {
    abrirModalPaciente(null, async (pacienteCriado) => {
      estado.pacientes = await api('GET', '/api/pacientes');
      abrirModalAgendamento(agendamento, horaSugerida, dataSugerida);
      form.querySelector('select[name="paciente_id"]');
      requestAnimationFrame(() => {
        const sel = modalRoot.querySelector('select[name="paciente_id"]');
        if (sel) sel.value = pacienteCriado.id;
      });
    });
  };

  if (editando) {
    form.querySelector('#btn-excluir').onclick = async () => {
      if (!confirm('Excluir este agendamento?')) return;
      await api('DELETE', `/api/agendamentos/${agendamento.id}`);
      fecharModal();
      renderAgenda();
    };
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const dados = Object.fromEntries(fd.entries());
    dados.paciente_id = Number(dados.paciente_id);
    dados.profissional_id = Number(dados.profissional_id);
    dados.duracao_min = Number(dados.duracao_min);
    dados.valor = Number(dados.valor) || 0;

    const antigo = form.querySelector('.mensagem-erro');
    if (antigo) antigo.remove();

    try {
      if (editando) {
        await api('PUT', `/api/agendamentos/${agendamento.id}`, dados);
      } else {
        await api('POST', '/api/agendamentos', dados);
      }
      fecharModal();
      renderAgenda();
    } catch (err) {
      form.prepend(elMensagemErro(err.message));
    }
  };
}

// ================= PACIENTES =================

async function renderPacientes() {
  app.innerHTML = '';

  const topo = document.createElement('div');
  topo.className = 'lista-topo';
  topo.innerHTML = `
    <input type="search" id="busca-paciente" placeholder="Buscar por nome ou telefone..." value="${escapeHtml(estado.buscaPaciente)}" />
    <button class="btn btn--primary" id="btn-novo-paciente">+ Novo paciente</button>
  `;
  app.appendChild(topo);

  topo.querySelector('#btn-novo-paciente').onclick = () => abrirModalPaciente();
  const inputBusca = topo.querySelector('#busca-paciente');
  inputBusca.oninput = debounce(() => {
    estado.buscaPaciente = inputBusca.value;
    listarEcarregarPacientes();
  }, 300);

  const lista = document.createElement('div');
  lista.id = 'lista-pacientes';
  app.appendChild(lista);

  await listarEcarregarPacientes();
}

async function listarEcarregarPacientes() {
  const lista = document.getElementById('lista-pacientes');
  if (!lista) return;
  const query = estado.buscaPaciente ? `?busca=${encodeURIComponent(estado.buscaPaciente)}` : '';
  const pacientes = await api('GET', `/api/pacientes${query}`);
  lista.innerHTML = '';

  if (pacientes.length === 0) {
    lista.appendChild(criarVazio('Nenhum paciente encontrado.'));
    return;
  }

  for (const p of pacientes) {
    const cartao = document.createElement('div');
    cartao.className = 'cartao';
    const ehConvenio = p.tipo_atendimento === 'convenio';
    cartao.innerHTML = `
      <div class="cartao__info">
        <div class="cartao__titulo">
          ${escapeHtml(p.nome)}
          <span class="badge ${ehConvenio ? 'badge-confirmado' : 'badge-concluido'}">${ehConvenio ? 'Convênio' : 'Particular'}</span>
        </div>
        <div class="cartao__sub">
          ${escapeHtml(p.telefone || 'sem telefone')}${p.email ? ' · ' + escapeHtml(p.email) : ''}
          ${ehConvenio && p.convenio_nome ? ' · ' + escapeHtml(p.convenio_nome) : ''}
        </div>
      </div>
      <div class="cartao__acoes">
        <button class="btn btn--sm" data-acao="editar">Editar</button>
        <button class="btn btn--sm btn--perigo" data-acao="excluir">Excluir</button>
      </div>
    `;
    cartao.querySelector('[data-acao="editar"]').onclick = () => abrirModalPaciente(p);
    cartao.querySelector('[data-acao="excluir"]').onclick = async () => {
      if (!confirm(`Excluir o paciente "${p.nome}"? Isso também remove os agendamentos dele.`)) return;
      await api('DELETE', `/api/pacientes/${p.id}`);
      listarEcarregarPacientes();
    };
    lista.appendChild(cartao);
  }
}

function abrirModalPaciente(paciente = null, aoSalvar = null) {
  const editando = !!paciente;
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="campo">
      <label>Nome completo</label>
      <input type="text" name="nome" value="${escapeHtml(paciente?.nome || '')}" required autofocus />
    </div>
    <div class="linha-campos">
      <div class="campo">
        <label>Telefone</label>
        <input type="tel" name="telefone" value="${escapeHtml(paciente?.telefone || '')}" placeholder="(11) 99999-9999" />
      </div>
      <div class="campo">
        <label>Data de nascimento</label>
        <input type="date" name="data_nascimento" value="${paciente?.data_nascimento || ''}" />
      </div>
    </div>
    <div class="campo">
      <label>E-mail</label>
      <input type="email" name="email" value="${escapeHtml(paciente?.email || '')}" />
    </div>
    <div class="linha-campos">
      <div class="campo">
        <label>Tipo de atendimento</label>
        <select name="tipo_atendimento" id="campo-tipo-atendimento">
          <option value="particular" ${(paciente?.tipo_atendimento ?? 'particular') === 'particular' ? 'selected' : ''}>Particular</option>
          <option value="convenio" ${paciente?.tipo_atendimento === 'convenio' ? 'selected' : ''}>Convênio</option>
        </select>
      </div>
      <div class="campo" id="campo-convenio-wrap" ${paciente?.tipo_atendimento === 'convenio' ? '' : 'hidden'}>
        <label>Nome do convênio</label>
        <input type="text" name="convenio_nome" value="${escapeHtml(paciente?.convenio_nome || '')}" placeholder="Ex: Amil, Bradesco Dental..." />
      </div>
    </div>
    <div class="campo">
      <label>Observações</label>
      <textarea name="observacoes">${escapeHtml(paciente?.observacoes || '')}</textarea>
    </div>
    <div class="modal__acoes">
      <button type="button" class="btn" id="btn-cancelar-modal">Fechar</button>
      <button type="submit" class="btn btn--primary">Salvar</button>
    </div>
  `;

  abrirModal(editando ? 'Editar paciente' : 'Novo paciente', form);
  form.querySelector('#btn-cancelar-modal').onclick = fecharModal;

  form.querySelector('#campo-tipo-atendimento').onchange = (e) => {
    form.querySelector('#campo-convenio-wrap').hidden = e.target.value !== 'convenio';
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form).entries());
    const antigo = form.querySelector('.mensagem-erro');
    if (antigo) antigo.remove();
    try {
      let resultado;
      if (editando) {
        resultado = await api('PUT', `/api/pacientes/${paciente.id}`, dados);
      } else {
        resultado = await api('POST', '/api/pacientes', dados);
      }
      estado.pacientes = await api('GET', '/api/pacientes');
      fecharModal();
      if (aoSalvar) aoSalvar(resultado);
      else if (estado.view === 'pacientes') listarEcarregarPacientes();
    } catch (err) {
      form.prepend(elMensagemErro(err.message));
    }
  };
}

// ================= PROFISSIONAIS =================

async function renderProfissionais() {
  app.innerHTML = '';

  const topo = document.createElement('div');
  topo.className = 'lista-topo';
  topo.innerHTML = `<div></div><button class="btn btn--primary" id="btn-novo-profissional">+ Novo profissional</button>`;
  app.appendChild(topo);
  topo.querySelector('#btn-novo-profissional').onclick = () => abrirModalProfissional();

  const lista = document.createElement('div');
  app.appendChild(lista);

  estado.profissionais = await api('GET', '/api/profissionais');

  if (estado.profissionais.length === 0) {
    lista.appendChild(criarVazio('Nenhum profissional cadastrado ainda.'));
    return;
  }

  for (const p of estado.profissionais) {
    const cartao = document.createElement('div');
    cartao.className = 'cartao';
    cartao.innerHTML = `
      <div class="cartao__info">
        <div class="cartao__titulo"><span class="chip-dot" style="background:${p.cor};display:inline-block;margin-right:6px;"></span>${escapeHtml(p.nome)}</div>
        <div class="cartao__sub">${escapeHtml(p.especialidade || '')}</div>
      </div>
      <div class="cartao__acoes">
        <button class="btn btn--sm" data-acao="editar">Editar</button>
        <button class="btn btn--sm btn--perigo" data-acao="excluir">Remover</button>
      </div>
    `;
    cartao.querySelector('[data-acao="editar"]').onclick = () => abrirModalProfissional(p);
    cartao.querySelector('[data-acao="excluir"]').onclick = async () => {
      if (!confirm(`Remover "${p.nome}" da lista de profissionais ativos?`)) return;
      await api('DELETE', `/api/profissionais/${p.id}`);
      renderProfissionais();
    };
    lista.appendChild(cartao);
  }
}

function abrirModalProfissional(profissional = null) {
  const editando = !!profissional;
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="campo">
      <label>Nome</label>
      <input type="text" name="nome" value="${escapeHtml(profissional?.nome || '')}" required autofocus />
    </div>
    <div class="campo">
      <label>Especialidade</label>
      <input type="text" name="especialidade" value="${escapeHtml(profissional?.especialidade || '')}" placeholder="Ex: Ortodontia, Clínico Geral..." />
    </div>
    <div class="campo">
      <label>Cor na agenda</label>
      <input type="color" name="cor" value="${profissional?.cor || '#22aad4'}" />
    </div>
    <div class="modal__acoes">
      <button type="button" class="btn" id="btn-cancelar-modal">Fechar</button>
      <button type="submit" class="btn btn--primary">Salvar</button>
    </div>
  `;

  abrirModal(editando ? 'Editar profissional' : 'Novo profissional', form);
  form.querySelector('#btn-cancelar-modal').onclick = fecharModal;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form).entries());
    const antigo = form.querySelector('.mensagem-erro');
    if (antigo) antigo.remove();
    try {
      if (editando) {
        await api('PUT', `/api/profissionais/${profissional.id}`, dados);
      } else {
        await api('POST', '/api/profissionais', dados);
      }
      fecharModal();
      renderProfissionais();
    } catch (err) {
      form.prepend(elMensagemErro(err.message));
    }
  };
}

// ================= FECHAMENTO (admin) =================

async function renderFechamento() {
  app.innerHTML = '';

  const nav = document.createElement('div');
  nav.className = 'agenda__nav';
  nav.innerHTML = `
    <div class="agenda__data">Fechamento — ${nomeMesAno(estado.fechamentoData)}</div>
    <div class="agenda__nav-btns">
      <button class="btn" id="btn-fech-anterior">‹ Mês anterior</button>
      <button class="btn" id="btn-fech-hoje">Este mês</button>
      <button class="btn" id="btn-fech-proximo">Próximo mês ›</button>
    </div>
  `;
  app.appendChild(nav);
  nav.querySelector('#btn-fech-anterior').onclick = () => {
    estado.fechamentoData = new Date(estado.fechamentoData.getFullYear(), estado.fechamentoData.getMonth() - 1, 1);
    renderFechamento();
  };
  nav.querySelector('#btn-fech-proximo').onclick = () => {
    estado.fechamentoData = new Date(estado.fechamentoData.getFullYear(), estado.fechamentoData.getMonth() + 1, 1);
    renderFechamento();
  };
  nav.querySelector('#btn-fech-hoje').onclick = () => {
    estado.fechamentoData = new Date();
    renderFechamento();
  };

  const primeiro = new Date(estado.fechamentoData.getFullYear(), estado.fechamentoData.getMonth(), 1);
  const ultimo = new Date(estado.fechamentoData.getFullYear(), estado.fechamentoData.getMonth() + 1, 0);

  let dados;
  try {
    dados = await api('GET', `/api/fechamento?inicio=${paraISO(primeiro)}&fim=${paraISO(ultimo)}`);
  } catch (err) {
    app.appendChild(elMensagemErro(err.message));
    return;
  }

  const { itens, resumo } = dados;

  const cards = document.createElement('div');
  cards.className = 'fechamento__resumo';
  cards.innerHTML = `
    <div class="resumo-card resumo-card--destaque">
      <div class="resumo-card__rotulo">Total do mês</div>
      <div class="resumo-card__valor">${formatarMoeda(resumo.totalGeral)}</div>
    </div>
    <div class="resumo-card">
      <div class="resumo-card__rotulo">Particular</div>
      <div class="resumo-card__valor">${formatarMoeda(resumo.totalParticular)}</div>
    </div>
    <div class="resumo-card">
      <div class="resumo-card__rotulo">Convênio</div>
      <div class="resumo-card__valor">${formatarMoeda(resumo.totalConvenio)}</div>
    </div>
    <div class="resumo-card">
      <div class="resumo-card__rotulo">Atendimentos concluídos</div>
      <div class="resumo-card__valor">${resumo.quantidade}</div>
    </div>
  `;
  app.appendChild(cards);

  if (resumo.porProfissional.length > 1) {
    const porProf = document.createElement('div');
    porProf.className = 'fechamento__profissionais';
    porProf.innerHTML = resumo.porProfissional
      .map(
        (p) => `
        <div class="fechamento__prof-item">
          <span class="chip-dot" style="background:${p.profissional_cor}"></span>
          <span class="fechamento__prof-nome">${escapeHtml(p.profissional_nome)}</span>
          <span class="fechamento__prof-valor">${formatarMoeda(p.total)} · ${p.quantidade} atend.</span>
        </div>`
      )
      .join('');
    app.appendChild(porProf);
  }

  if (itens.length === 0) {
    app.appendChild(criarVazio('Nenhum atendimento concluído neste mês.'));
    return;
  }

  const tabelaWrap = document.createElement('div');
  tabelaWrap.className = 'fechamento__tabela-wrap';
  const tabela = document.createElement('table');
  tabela.className = 'fechamento__tabela';
  tabela.innerHTML = `
    <thead>
      <tr>
        <th>Data</th>
        <th>Paciente</th>
        <th>Procedimento</th>
        <th>Profissional</th>
        <th>Tipo</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${itens
        .map((item) => {
          const dataFormatada = new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR');
          const ehConvenio = item.paciente_tipo_atendimento === 'convenio';
          return `
          <tr>
            <td>${dataFormatada} ${item.hora_inicio.slice(0, 5)}</td>
            <td>${escapeHtml(item.paciente_nome)}</td>
            <td>${escapeHtml(item.procedimento || '-')}</td>
            <td>${escapeHtml(item.profissional_nome)}</td>
            <td>${ehConvenio ? 'Convênio' : 'Particular'}</td>
            <td>${formatarMoeda(item.valor)}</td>
          </tr>`;
        })
        .join('')}
    </tbody>
  `;
  tabelaWrap.appendChild(tabela);
  app.appendChild(tabelaWrap);
}

// ---------- Utils ----------

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------- Início ----------

(async function iniciar() {
  try {
    const usuario = await api('GET', '/api/me');
    await mostrarApp(usuario);
  } catch {
    mostrarLogin();
  }
})();
