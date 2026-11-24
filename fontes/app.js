"use strict";
/* ============ utilidades ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl = v => (v == null || !isFinite(v)) ? "—" : v.toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
const brlc = v => { if (v == null || !isFinite(v)) return "—"; const a = Math.abs(v);
  if (a >= 1e9) return "R$ " + (v/1e9).toLocaleString("pt-BR",{maximumFractionDigits:2}) + " bi";
  if (a >= 1e6) return "R$ " + (v/1e6).toLocaleString("pt-BR",{maximumFractionDigits:2}) + " mi";
  if (a >= 1e3) return "R$ " + (v/1e3).toLocaleString("pt-BR",{maximumFractionDigits:0}) + " mil";
  return brl(v); };
const pct = (v, d = 2) => (v == null || !isFinite(v)) ? "—" : v.toLocaleString("pt-BR", {minimumFractionDigits:d, maximumFractionDigits:d}) + "%";
const fdate = s => s ? String(s).slice(0,10).split("-").reverse().join("/") : "—";
const fnumIn = n => (n == null || n === "" || !isFinite(n)) ? "" : Number(n).toLocaleString("pt-BR", {maximumFractionDigits:4});
const uid = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const todayISO = () => new Date().toISOString().slice(0, 10);
const curKey = () => todayISO().slice(0, 7);
function parseNum(s) {
  if (typeof s === "number") return isFinite(s) ? s : null;
  s = String(s ?? "").trim().replace(/R\$|\s|%/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
function parseDate(s) {
  s = String(s ?? "").trim(); if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  m = s.match(/^(\d{1,2})\/(\d{4})$/); if (m) return `${m[2]}-${m[1].padStart(2,"0")}-01`;
  return null;
}
const parseBool = s => ["sim","s","true","1","x","yes"].includes(norm(s));
function maskDoc(d) { d = String(d || ""); const digits = d.replace(/\D/g, "");
  if (digits.length === 11) return "***." + digits.slice(3,6) + "." + digits.slice(6,9) + "-**";
  return d; }
function toast(msg) { document.querySelectorAll(".toast").forEach(x => x.remove()); const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

/* ============ regras jurídicas (versionadas) ============ */
const ATOS = [
  {id:"descoberta", nome:"Descoberta", cor:"#5E8C7B"},
  {id:"abordagem", nome:"Abordagem", cor:"#4F7CA8"},
  {id:"fundo", nome:"Fundo", cor:"#7B6BA8"},
  {id:"negociacao", nome:"Negociação", cor:"#B8843A"},
  {id:"documentos", nome:"Documentos", cor:"#B0695B"},
  {id:"fechamento", nome:"Fechamento", cor:"#3E7F5A"},
];
const atoDe = id => ATOS.find(a => a.id === id) || {id:"", nome:"", cor:"#8A94A0"};
const ETAPAS_BASE = [
  {id:"alvo", nome:"Alvo escolhido", ato:"descoberta", missao:"Encontrar o contato do advogado do processo"},
  {id:"contato_adv", nome:"Contato do advogado encontrado", ato:"descoberta", missao:"Falar com o advogado", pede:"advogado"},
  {id:"adv_contatado", nome:"Advogado contatado", ato:"abordagem", missao:"Obter o sinal positivo para negociar com o titular"},
  {id:"sinal_positivo", nome:"Sinal positivo do advogado", ato:"abordagem", missao:"Enviar as informações ao fundo pelo nosso canal"},
  {id:"enviado_fundo", nome:"Enviado ao fundo", ato:"fundo", missao:"Aguardar a proposta do fundo"},
  {id:"proposta_fundo", nome:"Proposta do fundo recebida", ato:"fundo", missao:"Enviar a proposta ao titular", pede:"proposta"},
  {id:"proposta_titular", nome:"Proposta enviada ao titular", ato:"negociacao", missao:"Negociar com o titular"},
  {id:"negociacao", nome:"Em negociação", ato:"negociacao", missao:"Fechar o aceite do titular"},
  {id:"aceite", nome:"Aceite do titular", ato:"negociacao", missao:"Comunicar o aceite ao fundo", pede:"acordo"},
  {id:"aceite_fundo", nome:"Aceite enviado ao fundo", ato:"negociacao", missao:"Aguardar o pedido de documentos do fundo"},
  {id:"docs_pedidos", nome:"Fundo pediu documentos", ato:"documentos", missao:"Reunir certidões e documentos do titular"},
  {id:"docs_enviados", nome:"Documentos enviados ao fundo", ato:"documentos", missao:"Aguardar o contrato do fundo"},
  {id:"contrato_recebido", nome:"Contrato do fundo recebido", ato:"fechamento", missao:"Enviar o contrato aos advogados"},
  {id:"contrato_advogados", nome:"Contrato com os advogados", ato:"fechamento", missao:"Colher as assinaturas"},
  {id:"assinado", nome:"Contrato assinado", ato:"fechamento", missao:"Confirmar o pagamento e encerrar"},
  {id:"finalizado", nome:"Negócio finalizado", ato:"fechamento", final:true, ganho:true, missao:"Concluído"},
  {id:"perdido", nome:"Arquivado", ato:"", final:true, missao:"Negócio encerrado sem fechamento"},
].map(e => ({...e, cor:atoDe(e.ato).cor}));
const MIGRA_ETAPAS = {mapeado:"alvo", analise:"alvo", contatado:"adv_contatado", oferecido:"enviado_fundo", exclusividade:"negociacao", dd:"docs_pedidos", cessao:"assinado", concluido:"finalizado", perdido:"perdido"};
// Art. 100, §23, CF (EC 136/2025): estoque/RCL -> % mínimo da RCL
const FAIXAS_23 = [[15,1.0,"I"],[25,1.5,"II"],[35,2.0,"III"],[45,2.5,"IV"],[55,3.0,"V"],[65,3.5,"VI"],[75,4.0,"VII"],[85,4.5,"VIII"],[Infinity,5.0,"IX"]];
const faixa23 = r => FAIXAS_23.find(f => r <= f[0]);
const ADJ_2AA = (Math.pow(1.02, 1/12) - 1) * 100; // 2% a.a. em taxa mensal
const REGRAS = [
  {de:"2021-12", ate:"2025-07", nome:"SELIC — art. 3º EC 113/2021", metodo:"soma simples das taxas mensais"},
  {de:"2025-08", ate:null, nome:"IPCA + 2% a.a., limitado à SELIC — EC 136/2025 (sub judice: ADI 7873)", metodo:"soma simples; teto aplicado mês a mês [VERIFICAR]"},
];
const TIPOS_DED = {DESTAQUE_CONTRATUAL:"Destaque de honorários contratuais", SUCUMBENCIAIS:"Honorários sucumbenciais", IR:"Imposto de renda", INSS:"Contribuição previdenciária", ISS:"ISSQN", CESSAO_ANTERIOR:"Cessão anterior", OUTRA:"Outra"};
const TIPOS_RISCO = ["PENHORA","DIVIDA_ATIVA","RECUPERACAO_JUDICIAL","ESPOLIO_SOCIO","CERTIDAO_DESATUALIZADA","TEMA_1349","ADI_7873","SEGREDO_JUSTICA","DADOS_SENSIVEIS","OUTRO"];
const TRIBUNAIS = ["TJSC","TRF1","TJMG","TRF4","TRF6","Outro"];

/* ============ estado ============ */
const S = { db:null, dl:null, modo:"carregando", precs:[], etapas:ETAPAS_BASE.slice(), etapasSalvas:false,
  selic:{}, ipca:{}, idxMeta:{}, view:"funil", id:null, tab:"jornada", draft:null,
  f:{q:"", esfera:"", tribunal:"", natureza:"", regime:"", etapa:""}, sort:{k:"atualizado", dir:-1}, showDoc:false, imp:null };

const etapaDe = id => S.etapas.find(e => e.id === id) || {id, nome:id || "Sem etapa", cor:"#7a8290"};
const titularNome = p => (p.titulares && p.titulares[0] && p.titulares[0].nome) || "—";

/* ============ cálculos ============ */
function nextKey(k) { let [y, m] = k.split("-").map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2,"0")}`; }
function correcao(p) {
  if (p.valor_atualizado_informado) return {modo:"informado", bruto:p.valor_atualizado_informado, ref:p.data_valor_atualizado};
  if (!p.valor_face || !p.data_base) return {modo:"sem", motivo:"Informe o valor de face e a data-base para estimar a correção."};
  const dbk = p.data_base.slice(0, 7);
  if (dbk < "2021-12") return {modo:"sem", motivo:"Data-base anterior a 12/2021: o índice até 08/12/2021 varia por tema (810/STF, 905/STJ). Informe o valor atualizado pela conta do Tribunal."};
  let k = nextKey(dbk), soma = 0, linhas = [], ate = null, ck = curKey(), parou = null;
  while (k < ck) {
    const se = S.selic[k];
    if (se == null) { parou = k; break; }
    let taxa, regra;
    if (k >= "2025-08") {
      const ip = S.ipca[k];
      if (ip == null) { parou = k; break; }
      const t = ip + ADJ_2AA;
      if (t < se) { taxa = t; regra = "IPCA+2%"; } else { taxa = se; regra = "SELIC (teto)"; }
    } else { taxa = se; regra = "SELIC"; }
    soma += taxa; linhas.push({k, selic:se, ipca:S.ipca[k], taxa, regra}); ate = k; k = nextKey(k);
  }
  if (!linhas.length) return {modo:"sem", motivo:"Sem série de índices para o período. Confira a tela Índices."};
  return {modo:"estimado", pct:soma, bruto:p.valor_face * (1 + soma / 100), ate, linhas, parou};
}
function cascata(p, bruto) {
  const rows = []; let tot = 0;
  for (const d of (p.deducoes || [])) {
    const base = d.base === "FACE" ? (p.valor_face || 0) : bruto;
    const v = (d.valor != null && d.valor !== "") ? Number(d.valor) : base * (Number(d.percentual) || 0) / 100;
    rows.push({...d, calc:v}); tot += v;
  }
  return {rows, total:tot, liquido:bruto - tot};
}
function analise(p) {
  const c = correcao(p);
  const out = {c};
  if (!c.bruto) return out;
  const k = cascata(p, c.bruto); out.k = k; out.liq = k.liquido;
  const anoPag = p.ano_pagamento ? Number(p.ano_pagamento) : (p.exercicio ? Number(p.exercicio) : null);
  out.anoPag = anoPag;
  out.anos = anoPag ? Math.max(0.25, (new Date(anoPag, 11, 31) - new Date()) / (365.25 * 864e5)) : null;
  out.taxa = p.taxa_proj != null ? p.taxa_proj : 6.5;
  out.naFila = out.anos ? out.liq * Math.pow(1 + out.taxa / 100, out.anos) : null;
  out.desAc = p.desagio_acordo != null ? p.desagio_acordo : 35;
  out.acordo = out.liq * (1 - out.desAc / 100);
  out.proposta = p.proposta_fundo || null;
  out.cresc = (out.proposta && out.naFila && out.anos) ? Math.pow(out.naFila / out.proposta, 1 / out.anos) - 1 : null;
  const cv = Number(p.comissao_valor) || 0;
  out.comissao = !cv ? null : p.comissao_tipo === "fixo" ? cv
    : p.comissao_tipo === "pct_face" ? (p.valor_face || 0) * cv / 100
    : p.comissao_tipo === "pct_liquido" ? out.liq * cv / 100
    : (out.proposta ? out.proposta * cv / 100 : null);
  return out;
}
function prazoFila(p) {
  const e = Number(p.fila_estoque), r = Number(p.fila_rcl), f = Number(p.fila_soma_frente);
  if (!e || !r) return null;
  const ratio = e / r * 100, fx = faixa23(ratio), cota = r * fx[1] / 100;
  return {ratio, faixa:fx[2], perc:fx[1], cota, anos: f ? f / cota : null, cobre: cota / e};
}
function alertas(p, a) {
  a = a || analise(p); const L = [];
  if (p.superpreferencia) L.push(["alta","Superpreferência não se transfere","Art. 100, §2º, CF e art. 42, §2º, Res. CNJ 303/2019. O fundo não herda a antecipação: precifique pela fila " + (p.natureza === "ALIMENTAR" ? "alimentar" : "comum") + "."]);
  if (p.segredo_justica) L.push(["alta","Segredo de justiça","Só dados de capa podem circular. Nada dos autos vai ao fundo."]);
  if (a.proposta && a.acordo && a.proposta < a.acordo) L.push(["alta","Proposta do fundo abaixo do acordo direto", `O titular recebe ${brl(a.acordo)} no acordo direto (art. 100, §29, CF) contra ${brl(a.proposta)} do fundo. Nenhum argumento fecha isso: a conversa é com o fundo.`]);
  if (a.cresc != null && a.cresc > 0.35) L.push(["alta","Preço provavelmente baixo demais", `Nesse preço o dinheiro do fundo cresce ${pct(a.cresc*100,1)} ao ano (mercado busca 20% a 25%). Tende a não fechar e expõe a lesão (art. 157 CC).`]);
  else if (a.cresc != null && a.cresc < 0.15) L.push(["media","Retorno do fundo abaixo do usual", `Nesse preço o dinheiro do fundo cresce só ${pct(a.cresc*100,1)} ao ano. O fundo tende a recusar.`]);
  for (const d of (p.deducoes || [])) {
    if (d.valor && p.valor_face) { const r = d.valor / p.valor_face * 100;
      if (r >= 0.5 && Math.abs(r * 2 - Math.round(r * 2)) < 0.0005) L.push(["media","Possível dupla contagem", `${TIPOS_DED[d.tipo] || d.tipo}: ${brl(d.valor)} é exatamente ${pct(r)} da face. Confira na decisão de liquidação se já está dentro do valor de face.`]); }
  }
  const somaTit = (p.titulares || []).reduce((s, t) => s + (Number(t.percentual) || 0), 0);
  if (somaTit && Math.abs(somaTit - 100) > 0.01) L.push(["media","Percentuais dos titulares não somam 100%", `Soma atual: ${pct(somaTit)}.`]);
  if (p.ente_concordou !== "sim") L.push(["media","Concordância do ente não confirmada","É o documento mais valioso do dossiê. Localize a petição de concordância ou a certidão de ausência de impugnação."]);
  if (!p.data_base) L.push(["media","Data-base ausente","Sem ela não há correção. Atenção: data-base não é a data da conta."]);
  if (p.regime === "ESPECIAL" && !p.ano_pagamento) L.push(["media","Prazo de pagamento não estimado","Regime especial não tem prazo legal. Preencha estoque, RCL e soma à frente na aba Valores."]);
  if (a.c && a.c.modo === "estimado" && a.c.ate >= "2025-08") L.push(["baixa","Correção depende da EC 136/2025","Meses a partir de 08/2025 usam IPCA + 2% a.a. limitado à SELIC, regra atacada na ADI 7873."]);
  if (a.c && a.c.modo === "estimado") L.push(["baixa","Valor bruto é estimativa","Confira contra o valor da listagem ou da conta homologada e, se divergir, informe o valor atualizado."]);
  if (!(p.titulares || []).length) L.push(["media","Titular a identificar","Consulte o número do precatório no processo para descobrir titular e advogados. As listagens públicas não trazem o nome (art. 12, §3º, Res. CNJ 303/2019)."]);
  if (!(p.advogados || []).length) L.push(["baixa","Advogados não cadastrados","Se houver advogado com destaque ou requisição própria, ele precisa de instrumento simultâneo."]);
  if (/^TRF/.test(p.tribunal || "")) L.push(["baixa","Precatório federal","Regras e fontes federais ainda em verificação pela equipe."]);
  for (const r of (p.riscos || [])) if (!r.resolvido) L.push([r.severidade || "media", (r.tipo || "Risco").replace(/_/g, " "), r.descricao || ""]);
  return L;
}
const nAltos = L => L.filter(x => x[0] === "alta").length;

/* ============ persistência ============ */
async function salvarPrec(p) {
  p.atualizado = new Date().toISOString(); if (S.usuario) p.atualizado_por = S.usuario.email;
  const i = S.precs.findIndex(x => x.id === p.id);
  if (i >= 0) S.precs[i] = p; else S.precs.push(p);
  if (S.db) { try { await S.db.collection("precatorios").doc(p.id).set(JSON.parse(JSON.stringify(p))); }
    catch (e) { toast("Não foi possível salvar: " + (e.code || e.message)); return false; } }
  return true;
}
async function excluirPrec(id) {
  S.precs = S.precs.filter(x => x.id !== id);
  if (S.db) { try { await S.db.collection("precatorios").doc(id).delete(); } catch (e) { toast("Falha ao excluir: " + (e.code || e.message)); } }
}
async function salvarEtapas() {
  S.etapasSalvas = true;
  if (S.db) { try { await S.db.doc("config/etapas").set({lista:S.etapas}); } catch (e) { toast("Falha ao salvar etapas"); } }
}
async function salvarIndices() {
  if (S.db) { try { await S.db.doc("indices/serie").set({selic:S.selic, ipca:S.ipca, fonte:S.idxMeta.fonte || "Manual", coleta:todayISO()}); } catch (e) { toast("Falha ao salvar índices"); } }
}

/* ============ navegação ============ */
function go(view, id) { if (view === "ficha" && !["ficha","editar","novo"].includes(S.view)) S.voltar = S.view; S.view = view; S.id = id || null; if (view === "ficha") S.tab = S.tab || "jornada"; render(); window.scrollTo(0, 0); }
function renderNav() {
  const ativos = S.precs.filter(p => !etapaDe(p.etapa).final).length;
  const items = [["painel","Visão geral",""],["funil","Jornada dos negócios",ativos],["pesquisa","Explorar precatórios",""],["lista","Carteira",S.precs.length],["sep"],["novo","Novo precatório",""],["importar","Importar planilha",""],["sep"],["indices","Índices de correção",""],["config","Etapas e ajustes",""]];
  $("#nav").innerHTML = `<div class="brand"><span class="brand-mark">◆</span>Mesa de Precatórios<small>Da descoberta ao fechamento</small></div>` +
    items.map(it => it[0] === "sep" ? `<div class="sep"></div>` :
      `<button class="navbtn" data-go="${it[0]}" aria-current="${S.view === it[0] || (it[0]==="lista" && S.view==="ficha")}">${it[1]}<span class="count">${it[2]}</span></button>`).join("") +
    `<div class="foot">${S.usuario ? esc(S.usuario.email) + ` <button class="btn sm" id="sair" style="margin-top:6px">Sair</button><br>` : ""}${S.modo === "db" ? "Dados salvos no banco dos sócios" : S.modo === "memoria" ? "Modo temporário: dados não são salvos" : "Conectando…"}</div>`;
}
function render() {
  renderNav();
  const m = $("#main");
  const banner = S.modo === "memoria" ? `<div class="banner">Armazenamento indisponível nesta visualização. Você pode testar, mas o que for cadastrado some ao fechar a página.</div>` : "";
  const v = S.view;
  m.innerHTML = banner + (["painel","lista","funil"].includes(v) ? bannerDevolver() : "") + (v === "painel" ? vPainel() : v === "pesquisa" ? vPesquisaWrap() : v === "lista" ? vLista() : v === "funil" ? vFunil() : v === "ficha" ? vFicha()
    : v === "novo" || v === "editar" ? vForm() : v === "importar" ? vImportar() : v === "indices" ? vIndices() : vConfig());
  if (v === "funil") bindKanban();
}

/* ============ painel ============ */
function vPainel() {
  const P = S.precs;
  if (!P.length) return `<h1>Painel</h1><p class="sub">Nenhum precatório cadastrado.</p><div class="row"><button class="btn primary" data-go="novo">Cadastrar o primeiro</button><button class="btn" data-go="importar">Importar planilha</button></div>`;
  const an = P.map(p => ({p, a:analise(p)})); an.forEach(x => x.L = alertas(x.p, x.a));
  const ativos = an.filter(x => !etapaDe(x.p.etapa).final);
  const face = P.reduce((s, p) => s + (p.valor_face || 0), 0);
  const faceAt = ativos.reduce((s, x) => s + (x.p.valor_face || 0), 0);
  const com = ativos.reduce((s, x) => s + (x.a.comissao || 0), 0);
  const fed = P.filter(p => p.esfera === "FEDERAL").length;
  const altos = an.filter(x => nAltos(x.L)).sort((a, b) => nAltos(b.L) - nAltos(a.L));
  const maxFace = Math.max(1, ...S.etapas.map(e => P.filter(p => p.etapa === e.id).reduce((s, p) => s + (p.valor_face || 0), 0)));
  const recentes = P.slice().sort((a, b) => (b.atualizado || "").localeCompare(a.atualizado || "")).slice(0, 6);
  return `<h1>Painel</h1><p class="sub">Carteira mapeada e negociações em curso.</p>
  <div class="kpis">
    <div class="kpi"><div class="l">Precatórios</div><div class="v">${P.length}</div><div class="s">${P.length - fed} estaduais/municipais · ${fed} federais</div></div>
    <div class="kpi"><div class="l">Valor de face total</div><div class="v">${brlc(face)}</div><div class="s">soma nominal, datas-base distintas</div></div>
    <div class="kpi"><div class="l">Em negociação</div><div class="v">${ativos.length}</div><div class="s">${brlc(faceAt)} de face</div></div>
    <div class="kpi"><div class="l">Comissão potencial</div><div class="v">${brlc(com)}</div><div class="s">onde há comissão e proposta</div></div>
  </div>
  <div class="two">
    <div class="panel"><h3>Funil por etapa</h3>
      <table class="subtable"><tbody>${S.etapas.map(e => { const ps = P.filter(p => p.etapa === e.id); const f = ps.reduce((s, p) => s + (p.valor_face || 0), 0);
        return `<tr><td style="width:40%"><span class="row" style="gap:6px"><span class="dot" style="background:${esc(e.cor)}"></span>${esc(e.nome)}</span></td><td class="num" style="width:40px">${ps.length}</td><td><div class="bar"><span style="width:${f / maxFace * 100}%;background:${esc(e.cor)}"></span></div></td><td class="num" style="width:90px">${brlc(f)}</td></tr>`; }).join("")}</tbody></table>
    </div>
    <div class="panel"><h3>Alertas graves</h3>
      ${altos.length ? altos.slice(0, 8).map(x => `<div class="alert alta" style="cursor:pointer" data-open="${x.p.id}"><div><b>${esc(titularNome(x.p))}</b>${x.L.filter(l => l[0] === "alta").map(l => esc(l[1])).join(" · ")}</div></div>`).join("") : `<p class="hint">Nenhum alerta grave.</p>`}
    </div>
  </div>
  <div class="panel" style="margin-top:16px"><h3>Atualizados recentemente</h3>${tabela(recentes, true)}</div>`;
}

/* ============ lista ============ */
function filtrar() {
  const f = S.f, q = norm(f.q);
  let L = S.precs.filter(p => (!f.esfera || p.esfera === f.esfera) && (!f.tribunal || p.tribunal === f.tribunal) && (!f.natureza || p.natureza === f.natureza)
    && (!f.regime || p.regime === f.regime) && (!f.etapa || p.etapa === f.etapa)
    && (!q || norm([p.numero_precatorio, p.ente_devedor, p.processo_origem, p.processo_cumprimento, p.tipo_acao, ...(p.titulares || []).map(t => t.nome + " " + (t.documento || "")), ...(p.advogados || []).map(a => a.nome + " " + (a.oab || ""))].join(" ")).includes(q)));
  const k = S.sort.k, d = S.sort.dir;
  const val = p => k === "titular" ? titularNome(p) : k === "etapa" ? S.etapas.findIndex(e => e.id === p.etapa) : p[k];
  L.sort((a, b) => { const x = val(a), y = val(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR")) * d; });
  return L;
}
function tabela(L, compacto, semClique) {
  if (!L.length) return `<div class="empty">Nenhum precatório encontrado.</div>`;
  const cols = [["numero_precatorio","Nº precatório"],["titular","Titular"],["ente_devedor","Ente devedor"],["tribunal","Tribunal"],["natureza","Natureza"],["valor_face","Valor de face"],["data_base","Data-base"],["exercicio","Exercício"],["posicao_fila","Posição"],["etapa","Etapa"],["alertas","Alertas"]];
  const arrow = k => S.sort.k === k ? (S.sort.dir > 0 ? " ↑" : " ↓") : "";
  return `<div class="tablewrap"><table><thead><tr>${cols.map(c => `<th ${compacto || c[0]==="alertas" ? 'class="nosort"' : `data-sort="${c[0]}"`}>${c[1]}${compacto ? "" : arrow(c[0])}</th>`).join("")}</tr></thead><tbody>
  ${L.map(p => { const L2 = alertas(p), e = etapaDe(p.etapa), na = nAltos(L2), nm = L2.filter(x => x[0]==="media").length;
    return `<tr ${semClique ? "" : `class="click" data-open="${p.id}"`}>
      <td class="mono" style="white-space:nowrap">${esc(p.numero_precatorio || "—")}${p.exemplo ? `<div class="tag-ex">exemplo</div>` : ""}</td>
      <td>${esc(titularNome(p))}${(p.titulares||[]).length > 1 ? ` <span class="hint">+${p.titulares.length - 1}</span>` : ""}</td>
      <td>${esc(p.ente_devedor || "—")}</td>
      <td><span class="pill ${p.esfera === "FEDERAL" ? "fed" : ""}">${esc(p.tribunal || "—")}</span></td>
      <td>${p.natureza === "ALIMENTAR" ? `<span class="pill ok">Alimentar</span>` : p.natureza === "COMUM" ? "Comum" : "—"}${p.superpreferencia ? ` <span class="pill warn">Superpref.</span>` : ""}</td>
      <td class="num">${brl(p.valor_face)}</td><td class="mono">${fdate(p.data_base)}</td><td class="mono">${esc(p.exercicio || "—")}</td><td class="num">${p.posicao_fila ? p.posicao_fila.toLocaleString("pt-BR") + "º" : "—"}</td>
      <td><span class="row" style="gap:6px;flex-wrap:nowrap"><span class="dot" style="background:${esc(e.cor)}"></span>${esc(e.nome)}</span></td>
      <td>${na ? `<span class="pill bad">${na} grave${na > 1 ? "s" : ""}</span>` : ""} ${nm ? `<span class="pill warn">${nm}</span>` : ""}</td></tr>`; }).join("")}
  </tbody></table></div>`;
}
function vLista() {
  const L = filtrar(), f = S.f;
  const opt = (arr, v) => arr.map(o => `<option value="${esc(o[0])}" ${v === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("");
  const tribs = [...new Set(S.precs.map(p => p.tribunal).filter(Boolean))].sort();
  return `<div class="row"><div><h1>Precatórios</h1><p class="sub">${L.length} de ${S.precs.length} · soma de face ${brl(L.reduce((s, p) => s + (p.valor_face || 0), 0))}</p></div><div class="spacer"></div>
    <button class="btn" id="exportar">Exportar planilha</button><button class="btn primary" data-go="novo">Novo precatório</button></div>
  <div class="filters">
    <input type="search" id="fq" placeholder="Buscar nº, titular, CPF/CNPJ, advogado, OAB, ente, processo…" value="${esc(f.q)}">
    <select data-f="esfera"><option value="">Esfera</option>${opt([["FEDERAL","Federal"],["ESTADUAL","Estadual"],["MUNICIPAL","Municipal"]], f.esfera)}</select>
    <select data-f="tribunal"><option value="">Tribunal</option>${opt(tribs.map(t => [t, t]), f.tribunal)}</select>
    <select data-f="natureza"><option value="">Natureza</option>${opt([["COMUM","Comum"],["ALIMENTAR","Alimentar"]], f.natureza)}</select>
    <select data-f="regime"><option value="">Regime</option>${opt([["GERAL","Geral"],["ESPECIAL","Especial"]], f.regime)}</select>
    <select data-f="etapa"><option value="">Etapa</option>${opt(S.etapas.map(e => [e.id, e.nome]), f.etapa)}</select>
  </div>${tabela(L)}`;
}

/* ============ funil ============ */
function vFunil() {
  return `<div class="row"><div><h1>Funil de negociação</h1><p class="sub">Arraste o cartão para mudar de etapa, ou use o seletor no cartão.</p></div><div class="spacer"></div><button class="btn" data-go="config">Editar etapas</button></div>
  <div class="kanban">${S.etapas.map(e => { const ps = S.precs.filter(p => p.etapa === e.id);
    return `<div class="col" data-col="${e.id}"><div class="colh"><span class="dot" style="background:${esc(e.cor)}"></span>${esc(e.nome)}<span class="mono">${ps.length} · ${brlc(ps.reduce((s, p) => s + (p.valor_face || 0), 0))}</span></div>
    <div class="cards">${ps.map(p => { const na = nAltos(alertas(p)); return `<div class="card" draggable="true" data-card="${p.id}" data-open="${p.id}">
      <div class="t">${esc(titularNome(p))}</div><div class="m">${esc(p.ente_devedor || "—")} · ${esc(p.tribunal || "")}</div>
      <div class="row" style="margin-top:6px;gap:6px"><span class="mono" style="font-size:12.5px">${brlc(p.valor_face)}</span>${p.exercicio ? `<span class="pill">${esc(p.exercicio)}</span>` : ""}${na ? `<span class="pill bad">${na} grave${na>1?"s":""}</span>` : ""}</div>
      <select data-move="${p.id}" aria-label="Mover etapa">${S.etapas.map(x => `<option value="${x.id}" ${x.id === p.etapa ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select></div>`; }).join("")}</div></div>`; }).join("")}</div>`;
}
function bindKanban() {
  document.querySelectorAll(".card").forEach(c => c.addEventListener("dragstart", ev => ev.dataTransfer.setData("text/plain", c.dataset.card)));
  document.querySelectorAll(".col").forEach(col => {
    col.addEventListener("dragover", ev => { ev.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", ev => { ev.preventDefault(); col.classList.remove("over"); moverEtapa(ev.dataTransfer.getData("text/plain"), col.dataset.col); });
  });
}
async function moverEtapa(id, etapa) {
  const p = S.precs.find(x => x.id === id); if (!p || p.etapa === etapa) return;
  const de = etapaDe(p.etapa).nome;
  p.etapa = etapa; (p.notas = p.notas || []).push({data:new Date().toISOString(), texto:`Etapa: ${de} → ${etapaDe(etapa).nome}`, auto:true});
  await salvarPrec(p); render(); toast("Movido para " + etapaDe(etapa).nome);
}

/* ============ ficha ============ */
function vFicha() {
  const p = S.precs.find(x => x.id === S.id); if (!p) return `<div class="empty">Precatório não encontrado.</div>`;
  const a = analise(p), L = alertas(p, a), e = etapaDe(p.etapa);
  const tabs = [["jornada","Jornada"],["resumo","Resumo"],["partes","Partes e advogados"],["valores","Valores e prazo"],["negociacao","Negociação"],["riscos",`Riscos (${L.length})`]];
  let body = "";
  if (S.tab === "jornada") body = fJornada(p, a);
  else if (S.tab === "resumo") body = fResumo(p, a, L);
  else if (S.tab === "partes") body = fPartes(p);
  else if (S.tab === "valores") body = fValores(p, a);
  else if (S.tab === "negociacao") body = fNeg(p, a);
  else body = fRiscos(p, L);
  return `<button class="btn sm" data-go="${S.voltar || "funil"}">← ${({funil:"Jornada", lista:"Carteira", pesquisa:"Explorar", painel:"Visão geral"})[S.voltar || "funil"] || "Voltar"}</button>
  <div class="row" style="margin-top:14px;align-items:flex-start"><div style="min-width:0">
    <div class="mono" style="color:var(--ink2)">${esc(p.numero_precatorio || "sem número")} ${p.exemplo ? `<span class="tag-ex">exemplo do briefing</span>` : ""}</div>
    <h1>${esc(titularNome(p))}</h1>
    <div class="row" style="gap:6px"><span class="pill ${p.esfera === "FEDERAL" ? "fed" : ""}">${esc(p.tribunal || "—")}</span><span class="pill">${esc(p.ente_devedor || "—")}</span>
      <span class="pill">${p.regime === "ESPECIAL" ? "Regime especial" : p.regime === "GERAL" ? "Regime geral" : "Regime ?"}</span>
      ${p.natureza === "ALIMENTAR" ? `<span class="pill ok">Alimentar</span>` : `<span class="pill">Comum</span>`}${p.superpreferencia ? `<span class="pill warn">Superpreferência</span>` : ""}
      <span class="pill" style="background:transparent;border:1px solid var(--line)"><span class="dot" style="background:${esc(e.cor)}"></span>${esc(e.nome)}</span></div>
  </div><div class="spacer"></div><button class="btn" data-star="${p.id}">${p.interesse ? "★ Interesse" : "☆ Marcar interesse"}</button><button class="btn" data-edit="${p.id}">Editar</button><button class="btn danger" data-del="${p.id}">Excluir</button></div>
  <div class="tabs" role="tablist">${tabs.map(t => `<button class="tab" role="tab" data-tab="${t[0]}" aria-selected="${S.tab === t[0]}">${t[1]}</button>`).join("")}</div>${body}`;
}
const kv = (k, v, mono) => `<div><div class="k">${k}</div><div class="v ${mono ? "mono" : ""}">${v == null || v === "" ? "—" : v}</div></div>`;
function fResumo(p, a, L) {
  const grav = L.filter(x => x[0] === "alta");
  return `${grav.map(x => `<div class="alert alta"><div><b>${esc(x[1])}</b>${esc(x[2])}</div></div>`).join("")}
  <div class="kpis">
    <div class="kpi"><div class="l">Valor de face</div><div class="v">${brl(p.valor_face)}</div><div class="s">data-base ${fdate(p.data_base)}</div></div>
    <div class="kpi"><div class="l">Bruto hoje</div><div class="v">${brl(a.c.bruto)}</div><div class="s">${a.c.modo === "informado" ? "informado" + (a.c.ref ? " em " + fdate(a.c.ref) : "") : a.c.modo === "estimado" ? "estimado, +" + pct(a.c.pct) : "sem cálculo"}</div></div>
    <div class="kpi"><div class="l">Líquido ao titular</div><div class="v">${brl(a.liq)}</div><div class="s">após ${(p.deducoes || []).length} dedução(ões)</div></div>
    <div class="kpi"><div class="l">Pagamento previsto</div><div class="v">${a.anoPag || "—"}</div><div class="s">${p.posicao_fila ? "posição " + p.posicao_fila.toLocaleString("pt-BR") + "º" : "posição não informada"}</div></div>
  </div>
  <div class="panel"><h3>Precatório</h3><div class="dl">
    ${kv("Nº do precatório", esc(p.numero_precatorio), 1)}${kv("Tribunal", esc(p.tribunal))}${kv("Esfera", esc(p.esfera))}
    ${kv("Ente devedor", esc(p.ente_devedor))}${kv("CNPJ do ente", esc(p.ente_cnpj), 1)}${kv("Situação", esc(p.situacao))}
    ${kv("Exercício orçamentário", esc(p.exercicio), 1)}${kv("Posição na fila", p.posicao_fila ? p.posicao_fila.toLocaleString("pt-BR") + "º" + (p.data_posicao ? ` <span class="hint">em ${fdate(p.data_posicao)}</span>` : "") : "")}
    ${kv("Ente concordou com a conta?", p.ente_concordou === "sim" ? `<span class="pill ok">Sim</span>${p.data_concordancia ? " " + fdate(p.data_concordancia) : ""}` : p.ente_concordou === "nao" ? `<span class="pill bad">Não / impugnou</span>` : `<span class="pill warn">Não verificado</span>`)}
  </div></div>
  <div class="panel" style="margin-top:14px"><h3>Datas</h3><div class="dl">
    ${kv("Data-base do valor de face", fdate(p.data_base), 1)}${kv("Trânsito em julgado", fdate(p.data_transito), 1)}${kv("Expedição do ofício", fdate(p.data_expedicao), 1)}${kv("Apresentação ao Tribunal", fdate(p.data_apresentacao), 1)}
  </div></div>
  <div class="panel" style="margin-top:14px"><h3>Processo de origem</h3><div class="dl">
    ${kv("Processo de conhecimento", esc(p.processo_origem), 1)}${kv("Cumprimento de sentença", esc(p.processo_cumprimento), 1)}${kv("Processo administrativo (SEI)", esc(p.processo_sei), 1)}
    ${kv("Juízo de origem", esc(p.juizo_origem))}${kv("Tipo de ação", esc(p.tipo_acao))}${kv("Segredo de justiça", p.segredo_justica ? "Sim" : "Não")}
  </div>${p.observacoes ? `<h3 style="margin-top:14px">Observações</h3><p style="white-space:pre-wrap;margin:0">${esc(p.observacoes)}</p>` : ""}</div>`;
}
function fPartes(p) {
  const T = p.titulares || [], A = p.advogados || [];
  return `<div class="panel"><div class="row"><h3 style="margin:0">Titulares</h3><div class="spacer"></div><button class="btn sm" id="toggleDoc">${S.showDoc ? "Ocultar CPF/CNPJ" : "Mostrar CPF/CNPJ"}</button></div>
  ${T.length ? `<table class="subtable" style="margin-top:8px"><thead><tr><th class="nosort">Nome / razão social</th><th class="nosort">CPF/CNPJ</th><th class="nosort">Tipo</th><th class="nosort">%</th><th class="nosort">Contato</th></tr></thead><tbody>
  ${T.map(t => `<tr><td>${esc(t.nome)}${t.e_advogado ? ` <span class="pill">advogado</span>` : ""}</td><td class="mono">${esc(S.showDoc ? t.documento : maskDoc(t.documento)) || "—"}</td><td>${esc(t.tipo || "—")}</td><td class="num">${t.percentual ? pct(t.percentual) : "—"}</td><td>${esc(t.contato || "—")}</td></tr>`).join("")}</tbody></table>` : `<p class="hint">Nenhum titular cadastrado.</p>`}</div>
  <div class="panel" style="margin-top:14px"><h3>Advogados do processo</h3>
  ${A.length ? `<table class="subtable"><thead><tr><th class="nosort">Nome</th><th class="nosort">OAB</th><th class="nosort">Papel</th><th class="nosort">Telefone / e-mail</th></tr></thead><tbody>
  ${A.map(x => `<tr><td>${esc(x.nome)}</td><td class="mono">${esc(x.oab || "—")}</td><td>${esc(x.papel || "—")}</td><td>${esc([x.telefone, x.email].filter(Boolean).join(" · ") || "—")}</td></tr>`).join("")}</tbody></table>` : `<p class="hint">Nenhum advogado cadastrado. Em geral só aparecem nos autos, não na listagem do Tribunal.</p>`}</div>`;
}
function fValores(p, a) {
  const c = a.c;
  let corr;
  if (c.modo === "sem") corr = `<div class="alert media"><div><b>Correção não calculada</b>${esc(c.motivo)}</div></div>`;
  else if (c.modo === "informado") corr = `<p>Valor bruto atualizado <b>informado</b>${c.ref ? " em " + fdate(c.ref) : ""}: <span class="mono">${brl(c.bruto)}</span>. O sistema não recalcula quando há valor informado.</p>`;
  else corr = `<p>Estimativa: face <span class="mono">${brl(p.valor_face)}</span> × (1 + <span class="mono">${pct(c.pct)}</span>) = <b class="mono">${brl(c.bruto)}</b>, somando as taxas mensais de ${fdate(c.linhas[0].k + "-01").slice(3)} a ${fdate(c.ate + "-01").slice(3)}.${c.parou ? ` <span class="hint">Série termina antes de ${fdate(c.parou + "-01").slice(3)}; atualize em Índices.</span>` : ""}</p>
    <details><summary style="cursor:pointer;color:var(--accent)">Ver mês a mês (${c.linhas.length} meses)</summary><div class="tablewrap" style="margin-top:8px;max-height:300px;overflow:auto"><table><thead><tr><th class="nosort">Mês</th><th class="nosort">SELIC</th><th class="nosort">IPCA</th><th class="nosort">Regra</th><th class="nosort">Taxa somada</th><th class="nosort">Acumulado</th></tr></thead><tbody>
    ${(() => { let s = 0; return c.linhas.map(l => { s += l.taxa; return `<tr><td class="mono">${fdate(l.k + "-01").slice(3)}</td><td class="num">${pct(l.selic)}</td><td class="num">${l.ipca != null && l.k >= "2025-08" ? pct(l.ipca) : "—"}</td><td>${l.regra}</td><td class="num">${pct(l.taxa, 4)}</td><td class="num">${pct(s)}</td></tr>`; }).join(""); })()}
    </tbody></table></div></details>`;
  const k = a.k;
  const casc = !c.bruto ? "" : `<table class="casc"><tbody>
    <tr><td>Valor bruto hoje</td><td class="num">${brl(c.bruto)}</td></tr>
    ${k.rows.map(r => `<tr><td>− ${esc(TIPOS_DED[r.tipo] || r.tipo)}${r.percentual && !r.valor ? ` <span class="hint">${pct(r.percentual)} sobre ${r.base === "FACE" ? "a face" : "o bruto"}</span>` : ""}${r.beneficiario ? ` <span class="hint">· ${esc(r.beneficiario)}</span>` : ""}${r.status ? ` <span class="pill">${esc(r.status)}</span>` : ""}</td><td class="num">− ${brl(r.calc)}</td></tr>`).join("")}
    <tr class="tot"><td>Valor líquido ao titular</td><td class="num">${brl(a.liq)}</td></tr></tbody></table>`;
  const pz = prazoFila(p);
  const cmp = !c.bruto ? "" : `<div class="cmp">
    <div class="c"><h3>(a) Esperar a fila</h3><div class="v">${brl(a.naFila)}</div><div class="hint">${a.anoPag ? `recebe em ${a.anoPag}, corrigido a ${pct(a.taxa, 1)} a.a. (premissa)` : "informe o ano previsto de pagamento"}</div></div>
    <div class="c"><h3>(b) Acordo direto — art. 100, §29</h3><div class="v">${brl(a.acordo)}</div><div class="hint">renúncia de ${pct(a.desAc, 0)} sobre o líquido; paga até o fim do exercício seguinte${p.regime !== "ESPECIAL" ? ". Atenção: §29 é do regime especial" : ""}</div></div>
    <div class="c ${a.proposta && a.proposta < a.acordo ? "hl" : ""}"><h3>(c) Proposta do fundo</h3><div class="v">${brl(a.proposta)}</div><div class="hint">${a.proposta ? `${pct(a.proposta / a.liq * 100, 1)} do líquido de hoje${a.cresc != null ? `. O dinheiro do fundo cresce <b>${pct(a.cresc * 100, 1)} ao ano</b>` : ""}` : "sem proposta registrada"}</div></div>
  </div>`;
  return `<div class="panel"><h3>1. Valor bruto hoje</h3>${corr}</div>
  <div class="panel" style="margin-top:14px"><h3>2. Cascata de deduções</h3>${casc || `<p class="hint">Sem valor bruto.</p>`}${!(p.deducoes || []).length ? `<p class="hint">Nenhuma dedução cadastrada. Destaque contratual chega a 25%.</p>` : ""}</div>
  <div class="panel" style="margin-top:14px"><h3>3. Alternativas do titular × proposta do fundo</h3>${cmp || `<p class="hint">Sem valor bruto.</p>`}</div>
  <div class="panel" style="margin-top:14px"><h3>4. Prazo pela aritmética da fila (regime especial)</h3>
    <div class="fgrid">
      <label class="f">Estoque total de precatórios do ente (R$)<input data-q="fila_estoque" inputmode="decimal" value="${fnumIn(p.fila_estoque)}"></label>
      <label class="f">RCL anual do ente (R$)<input data-q="fila_rcl" inputmode="decimal" value="${fnumIn(p.fila_rcl)}"></label>
      <label class="f">Soma dos precatórios à frente (R$)<input data-q="fila_soma_frente" inputmode="decimal" value="${fnumIn(p.fila_soma_frente)}"></label>
      <label class="f">Ano previsto de pagamento<input data-q="ano_pagamento" inputmode="numeric" value="${esc(p.ano_pagamento || "")}"></label>
    </div>
    ${pz ? `<table class="casc" style="margin-top:12px"><tbody>
      <tr><td>Estoque ÷ RCL</td><td class="num">${pct(pz.ratio)}</td></tr>
      <tr><td>Faixa do art. 100, §23, CF</td><td class="num">Faixa ${pz.faixa} → ${pct(pz.perc, 1)} da RCL</td></tr>
      <tr><td>Cota anual mínima</td><td class="num">${brl(pz.cota)}</td></tr>
      <tr><td>Cota ÷ estoque</td><td class="num">${pz.cobre.toLocaleString("pt-BR", {maximumFractionDigits:2})}×</td></tr>
      ${pz.anos != null ? `<tr class="tot"><td>Prazo estimado (soma à frente ÷ cota)</td><td class="num">${pz.anos.toLocaleString("pt-BR", {maximumFractionDigits:1})} ano(s) → ~${new Date().getFullYear() + Math.ceil(pz.anos)}</td></tr>` : ""}
    </tbody></table><p class="hint">Não considera aceleração da fila nem aportes acima do mínimo (§28). O +0,5 p.p. por década do §24 só começa em 2036.</p>` : `<p class="hint" style="margin-top:8px">Preencha estoque e RCL para calcular a faixa e a cota anual.</p>`}
    <div class="row" style="margin-top:10px"><button class="btn primary sm" id="salvarFila">Salvar prazo</button></div>
  </div>`;
}
function fNeg(p, a) {
  const notas = (p.notas || []).slice().reverse();
  return `<div class="two"><div class="panel"><h3>Negociação</h3><div class="fgrid">
    <label class="f">Etapa<select data-q="etapa">${S.etapas.map(e => `<option value="${e.id}" ${e.id === p.etapa ? "selected" : ""}>${esc(e.nome)}</option>`).join("")}</select></label>
    <label class="f">Fundo interessado<input data-q="fundo_nome" value="${esc(p.fundo_nome || "")}"></label>
    <label class="f">Proposta do fundo (R$)<input data-q="proposta_fundo" inputmode="decimal" value="${fnumIn(p.proposta_fundo)}"><span class="hint">teto/orçamento do fundo</span></label>
    <label class="f">Deságio no acordo direto (%)<input data-q="desagio_acordo" inputmode="decimal" value="${fnumIn(p.desagio_acordo ?? 35)}"><span class="hint">típico 30% a 40%; confira o edital</span></label>
    <label class="f">Correção projetada até o pagamento (% a.a.)<input data-q="taxa_proj" inputmode="decimal" value="${fnumIn(p.taxa_proj ?? 6.5)}"></label>
    <label class="f">Nossa comissão<select data-q="comissao_tipo">${[["pct_preco","% sobre o preço pago"],["pct_face","% sobre o valor de face"],["pct_liquido","% sobre o líquido"],["fixo","Valor fixo (R$)"]].map(o => `<option value="${o[0]}" ${p.comissao_tipo === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select></label>
    <label class="f">Comissão (% ou R$)<input data-q="comissao_valor" inputmode="decimal" value="${fnumIn(p.comissao_valor)}"></label>
  </div>
  <div class="row" style="margin-top:12px"><button class="btn primary" id="salvarNeg">Salvar negociação</button><span class="spacer"></span><span>Comissão estimada: <b class="mono">${brl(a.comissao)}</b></span></div></div>
  <div class="panel"><h3>Histórico e anotações</h3>
    <label class="f"><textarea id="novaNota" placeholder="Ex.: titular pediu 60% do líquido; advogado quer participar."></textarea></label>
    <div class="row" style="margin:8px 0 14px"><button class="btn sm" id="addNota">Adicionar anotação</button></div>
    ${notas.length ? notas.map(n => `<div class="note"><div class="d">${new Date(n.data).toLocaleString("pt-BR")}${n.por ? " · " + esc(n.por) : ""}</div><div style="${n.auto ? "color:var(--ink2)" : ""}">${esc(n.texto)}</div></div>`).join("") : `<p class="hint">Sem anotações.</p>`}
  </div></div>`;
}
function fRiscos(p, L) {
  const R = p.riscos || [];
  return `<div class="panel"><h3>Alertas automáticos e riscos em aberto</h3>${L.length ? L.map(x => `<div class="alert ${x[0]}"><div><b>${esc(x[1])}</b>${esc(x[2])}</div></div>`).join("") : `<p class="hint">Nenhum alerta.</p>`}</div>
  <div class="panel" style="margin-top:14px"><h3>Riscos registrados manualmente</h3>
  ${R.length ? `<table class="subtable"><tbody>${R.map((r, i) => `<tr><td><span class="pill ${r.severidade === "alta" ? "bad" : r.severidade === "media" ? "warn" : ""}">${esc(r.severidade)}</span></td><td><b>${esc((r.tipo || "").replace(/_/g, " "))}</b><div>${esc(r.descricao)}</div></td><td style="white-space:nowrap">${r.resolvido ? `<span class="pill ok">resolvido</span>` : ""} <button class="btn sm" data-risco="${i}">${r.resolvido ? "Reabrir" : "Marcar resolvido"}</button></td></tr>`).join("")}</tbody></table>` : `<p class="hint">Nenhum.</p>`}
  <div class="fgrid" style="margin-top:12px">
    <label class="f">Tipo<select id="rTipo">${TIPOS_RISCO.map(t => `<option>${t}</option>`).join("")}</select></label>
    <label class="f">Gravidade<select id="rSev"><option value="alta">alta</option><option value="media" selected>media</option><option value="baixa">baixa</option></select></label>
    <label class="f wide">Descrição<input id="rDesc" placeholder="Ex.: penhora com ofício à 9ª Vara Federal, sem notícia de baixa"></label>
  </div><div class="row" style="margin-top:10px"><button class="btn sm primary" id="addRisco">Registrar risco</button></div></div>`;
}

/* ============ formulário ============ */
function novoDraft() {
  return {id:uid(), tribunal:"TJSC", esfera:"ESTADUAL", regime:"", natureza:"COMUM", superpreferencia:false, situacao:"ABERTO", etapa:S.etapas[0].id,
    titulares:[{nome:"", documento:"", tipo:"PJ", percentual:100}], advogados:[], deducoes:[], riscos:[], notas:[], comissao_tipo:"pct_preco", desagio_acordo:35, taxa_proj:6.5, criado:new Date().toISOString()};
}
function inp(path, label, opts = {}) {
  const v = getPath(S.draft, path); const t = opts.t || "text";
  const val = t === "num" ? fnumIn(v) : (v ?? "");
  if (opts.sel) return `<label class="f ${opts.wide ? "wide" : ""}">${label}<select data-p="${path}" data-t="${t}">${opts.sel.map(o => `<option value="${esc(o[0])}" ${String(v ?? "") === String(o[0]) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>${opts.h ? `<span class="hint">${opts.h}</span>` : ""}</label>`;
  if (t === "bool") return `<label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-p="${path}" data-t="bool" ${v ? "checked" : ""} style="width:auto">${label}</label>`;
  if (t === "area") return `<label class="f wide">${label}<textarea data-p="${path}" data-t="text">${esc(val)}</textarea></label>`;
  return `<label class="f ${opts.wide ? "wide" : ""}">${label}<input data-p="${path}" data-t="${t}" ${t === "date" ? 'type="date"' : ""} ${t === "num" ? 'inputmode="decimal"' : ""} value="${esc(val)}" ${opts.ph ? `placeholder="${esc(opts.ph)}"` : ""}>${opts.h ? `<span class="hint">${opts.h}</span>` : ""}</label>`;
}
function getPath(o, p) { return p.split(".").reduce((x, k) => x == null ? x : x[k], o); }
function setPath(o, p, v) { const ks = p.split("."); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]]; x[ks[ks.length - 1]] = v; }
function subRows(key, cols, addLabel) {
  const rows = S.draft[key] || [];
  return `<div style="overflow-x:auto"><table class="subtable"><thead><tr>${cols.map(c => `<th class="nosort">${c[1]}</th>`).join("")}<th class="nosort"></th></tr></thead><tbody>
  ${rows.map((r, i) => `<tr>${cols.map(c => { const path = `${key}.${i}.${c[0]}`, v = r[c[0]];
    if (c[2] === "sel") return `<td><select data-p="${path}" data-t="text">${c[3].map(o => `<option value="${o[0]}" ${v === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select></td>`;
    if (c[2] === "bool") return `<td style="text-align:center"><input type="checkbox" data-p="${path}" data-t="bool" ${v ? "checked" : ""} style="width:auto;min-width:0"></td>`;
    return `<td><input data-p="${path}" data-t="${c[2] || "text"}" ${c[2] === "num" ? 'inputmode="decimal"' : ""} value="${esc(c[2] === "num" ? fnumIn(v) : (v ?? ""))}"></td>`; }).join("")}
    <td><button type="button" class="btn sm danger" data-rm="${key}" data-i="${i}" aria-label="Remover">×</button></td></tr>`).join("")}
  </tbody></table></div><button type="button" class="btn sm" data-add="${key}">+ ${addLabel}</button>`;
}
function vForm() {
  if (!S.draft) S.draft = novoDraft();
  const ed = S.view === "editar";
  const tribOpts = TRIBUNAIS.map(t => [t, t]); if (S.draft.tribunal && !TRIBUNAIS.includes(S.draft.tribunal)) tribOpts.unshift([S.draft.tribunal, S.draft.tribunal]);
  return `<h1>${ed ? "Editar precatório" : "Novo precatório"}</h1><p class="sub">Só o essencial é obrigatório: número, ente devedor e valor de face. O resto pode ser completado depois.</p>
  <form id="form">
  <fieldset><legend>Identificação</legend><div class="fgrid">
    ${inp("numero_precatorio", "Nº do precatório *", {ph:"5058973-09.2026.8.24.0000"})}
    ${inp("tribunal", "Tribunal", {sel:tribOpts})}
    ${inp("esfera", "Esfera", {sel:[["ESTADUAL","Estadual"],["MUNICIPAL","Municipal"],["FEDERAL","Federal"]]})}
    ${inp("situacao", "Situação", {sel:[["ABERTO","Aberto"],["PARCIAL","Pago parcialmente"],["PAGO","Pago"],["SUSPENSO","Suspenso"],["CANCELADO","Cancelado"]]})}
  </div></fieldset>
  <fieldset><legend>Ente devedor e fila</legend><div class="fgrid">
    ${inp("ente_devedor", "Ente devedor *", {ph:"Estado de Santa Catarina"})}
    ${inp("ente_cnpj", "CNPJ do ente")}
    ${inp("regime", "Regime de pagamento", {sel:[["","Não informado"],["GERAL","Geral (art. 100, §5º)"],["ESPECIAL","Especial (§§23-30)"]]})}
    ${inp("natureza", "Natureza", {sel:[["COMUM","Comum"],["ALIMENTAR","Alimentar (§1º)"]]})}
    ${inp("exercicio", "Exercício orçamentário", {ph:"2028"})}
    ${inp("posicao_fila", "Posição na fila", {t:"num"})}
    ${inp("data_posicao", "Data da posição", {t:"date", h:"necessária para medir velocidade da fila"})}
    ${inp("superpreferencia", "Superpreferência (§2º) — não se transfere na cessão", {t:"bool"})}
  </div></fieldset>
  <fieldset><legend>Valores</legend><div class="fgrid">
    ${inp("valor_face", "Valor de face (R$) *", {t:"num"})}
    ${inp("data_base", "Data-base do valor de face", {t:"date", h:"data a que o valor se reporta, não a data da conta"})}
    ${inp("valor_atualizado_informado", "Valor atualizado informado (R$)", {t:"num", h:"da listagem ou conta; substitui a estimativa"})}
    ${inp("data_valor_atualizado", "Data do valor atualizado", {t:"date"})}
  </div></fieldset>
  <fieldset><legend>Datas e processo de origem</legend><div class="fgrid">
    ${inp("data_transito", "Trânsito em julgado", {t:"date"})}
    ${inp("data_expedicao", "Expedição do ofício requisitório", {t:"date"})}
    ${inp("data_apresentacao", "Apresentação ao Tribunal", {t:"date", h:"define o exercício"})}
    ${inp("processo_origem", "Processo de conhecimento")}
    ${inp("processo_cumprimento", "Cumprimento de sentença")}
    ${inp("processo_sei", "Processo administrativo (SEI)")}
    ${inp("juizo_origem", "Juízo de origem")}
    ${inp("tipo_acao", "Tipo de ação", {ph:"desapropriação, repetição de indébito…"})}
    ${inp("ente_concordou", "Ente concordou com a conta?", {sel:[["","Não verificado"],["sim","Sim"],["nao","Não / impugnou"]]})}
    ${inp("data_concordancia", "Data da concordância", {t:"date"})}
    ${inp("segredo_justica", "Processo em segredo de justiça", {t:"bool"})}
  </div></fieldset>
  <fieldset><legend>Titulares</legend>${subRows("titulares", [["nome","Nome / razão social"],["documento","CPF/CNPJ"],["tipo","Tipo","sel",[["PF","PF"],["PJ","PJ"],["ESPOLIO","Espólio"],["SOC_ADV","Soc. de advogados"]]],["percentual","%","num"],["contato","Contato"],["e_advogado","É advogado?","bool"]], "titular")}</fieldset>
  <fieldset><legend>Advogados do processo</legend>${subRows("advogados", [["nome","Nome"],["oab","OAB"],["papel","Papel"],["telefone","Telefone"],["email","E-mail"]], "advogado")}</fieldset>
  <fieldset><legend>Deduções <span class="hint">informe % ou valor fixo</span></legend>${subRows("deducoes", [["tipo","Tipo","sel",Object.entries(TIPOS_DED)],["percentual","%","num"],["valor","Valor fixo (R$)","num"],["base","Base do %","sel",[["BRUTO","Bruto atual"],["FACE","Face"]]],["beneficiario","Beneficiário"],["status","Status","sel",[["","—"],["REQUERIDO","Requerido"],["DEFERIDO","Deferido"],["INDEFERIDO","Indeferido"]]]], "dedução")}</fieldset>
  <fieldset><legend>Observações</legend><div class="fgrid">${inp("observacoes", "Observações", {t:"area"})}</div></fieldset>
  <div class="row"><button type="submit" class="btn primary">${ed ? "Salvar alterações" : "Cadastrar precatório"}</button><button type="button" class="btn" id="cancelar">Cancelar</button></div>
  </form>`;
}
function lerCampo(el) {
  const t = el.dataset.t;
  if (t === "bool") return el.checked;
  if (t === "num") return parseNum(el.value);
  if (t === "date") return el.value || null;
  return el.value;
}

/* ============ importação ============ */
const COLS_IMP = [
  ["numero_precatorio","Nº do precatório",["precatorio","numero","nprecatorio","numeroprecatorio"]],
  ["tribunal","Tribunal",[]],["esfera","Esfera",[]],["ente_devedor","Ente devedor",["devedor","entidadedevedora","ente"]],["ente_cnpj","CNPJ do ente",[]],
  ["regime","Regime",["regimepagamento"]],["natureza","Natureza",[]],["superpreferencia","Superpreferência",["superpreferencial"]],
  ["valor_face","Valor de face",["valor","valorface","valororiginal"]],["data_base","Data-base",["database","databasevalor"]],
  ["valor_atualizado_informado","Valor atualizado",["valoratualizado"]],["data_valor_atualizado","Data do valor atualizado",[]],
  ["data_apresentacao","Data de apresentação",["apresentacao"]],["data_expedicao","Data de expedição",["expedicao"]],["data_transito","Trânsito em julgado",["transito"]],
  ["exercicio","Exercício",["exercicioorcamentario","ano"]],["posicao_fila","Posição",["posicaofila","ordem","ordemcronologica"]],["data_posicao","Data da posição",[]],
  ["situacao","Situação",[]],["processo_origem","Processo de origem",["processoconhecimento","processooriginario","processo"]],["processo_cumprimento","Cumprimento de sentença",["processocumprimento","execucao"]],
  ["tipo_acao","Tipo de ação",["assunto","acao"]],["juizo_origem","Juízo de origem",["vara","juizo"]],
  ["titular_nome","Titular",["credor","beneficiario","nometitular","requerente"]],["titular_documento","CPF/CNPJ do titular",["cpfcnpj","cpf","cnpj","documento"]],["titular_tipo","Tipo do titular",[]],
  ["advogado_nome","Advogado",["advogados","nomeadvogado"]],["advogado_oab","OAB",["oabadvogado"]],["advogado_contato","Contato do advogado",[]],
  ["destaque_pct","Destaque de honorários (%)",["destaque","honorarioscontratuais"]],["etapa","Etapa",[]],["observacoes","Observações",["obs"]],
];
const CSV_ESC = v => { v = String(v ?? ""); return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
function parseTabela(txt) {
  txt = txt.replace(/^﻿/, "");
  const first = txt.split(/\r?\n/)[0] || "";
  const d = first.includes("\t") ? "\t" : (first.split(";").length >= first.split(",").length ? ";" : ",");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < txt.length; i++) { const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === d) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
function mapear(rows) {
  const head = rows[0].map(norm), map = {};
  head.forEach((h, i) => { const c = COLS_IMP.find(c => norm(c[1]) === h || norm(c[0]) === h || c[2].includes(h)); if (c && map[c[0]] == null) map[c[0]] = i; });
  const itens = rows.slice(1).map(r => { const g = k => map[k] != null ? (r[map[k]] || "").trim() : "";
    const trib = g("tribunal") || ""; const esf = norm(g("esfera"));
    const p = novoDraft(); p.tribunal = trib || ""; p.esfera = esf.startsWith("fed") ? "FEDERAL" : esf.startsWith("mun") ? "MUNICIPAL" : esf.startsWith("est") ? "ESTADUAL" : (/^TRF/i.test(trib) ? "FEDERAL" : "ESTADUAL");
    Object.assign(p, {numero_precatorio:g("numero_precatorio"), ente_devedor:g("ente_devedor"), ente_cnpj:g("ente_cnpj"),
      regime:/esp/i.test(g("regime")) ? "ESPECIAL" : /ger/i.test(g("regime")) ? "GERAL" : "", natureza:/alim/i.test(g("natureza")) ? "ALIMENTAR" : "COMUM",
      superpreferencia:parseBool(g("superpreferencia")), valor_face:parseNum(g("valor_face")), data_base:parseDate(g("data_base")),
      valor_atualizado_informado:parseNum(g("valor_atualizado_informado")), data_valor_atualizado:parseDate(g("data_valor_atualizado")),
      data_apresentacao:parseDate(g("data_apresentacao")), data_expedicao:parseDate(g("data_expedicao")), data_transito:parseDate(g("data_transito")),
      exercicio:g("exercicio"), posicao_fila:parseNum(g("posicao_fila")), data_posicao:parseDate(g("data_posicao")), situacao:(g("situacao") || "ABERTO").toUpperCase(),
      processo_origem:g("processo_origem"), processo_cumprimento:g("processo_cumprimento"), tipo_acao:g("tipo_acao"), juizo_origem:g("juizo_origem"), observacoes:g("observacoes")});
    const tt = norm(g("titular_tipo"));
    p.titulares = g("titular_nome") ? [{nome:g("titular_nome"), documento:g("titular_documento"), tipo:tt.startsWith("pf") ? "PF" : tt.startsWith("esp") ? "ESPOLIO" : tt.includes("adv") ? "SOC_ADV" : (g("titular_documento").replace(/\D/g, "").length === 11 ? "PF" : "PJ"), percentual:100}] : [];
    p.advogados = g("advogado_nome") ? g("advogado_nome").split(/\s*[|\/]\s*/).map((n, i) => ({nome:n, oab:(g("advogado_oab").split(/\s*[|\/]\s*/)[i] || ""), papel:"", telefone:i ? "" : g("advogado_contato"), email:""})) : [];
    const dp = parseNum(g("destaque_pct")); if (dp) p.deducoes = [{tipo:"DESTAQUE_CONTRATUAL", percentual:dp, base:"BRUTO", beneficiario:p.advogados[0] ? p.advogados[0].nome : "", status:""}];
    const et = norm(g("etapa")); const e = et && S.etapas.find(x => norm(x.nome) === et || x.id === et); if (e) p.etapa = e.id;
    if (!p.tribunal) delete p.tribunal;
    return p; });
  return {map, itens:itens.filter(p => p.numero_precatorio || p.ente_devedor || p.valor_face), naoMapeadas:rows[0].filter((h, i) => !Object.values(map).includes(i))};
}
function vImportar() {
  const im = S.imp;
  let prev = "";
  if (im) { const base = S.impDest !== "carteira"; const exist = new Set(S.precs.map(p => p.numero_precatorio).filter(Boolean)); const dup = base ? 0 : im.itens.filter(p => p.numero_precatorio && exist.has(p.numero_precatorio)).length;
    const grupos = base ? gruposImport(im.itens) : [];
    prev = `<div class="panel" style="margin-top:16px"><h3>Pré-visualização</h3>
      <p>${im.itens.length} linha(s) reconhecida(s). Colunas usadas: ${Object.keys(im.map).length}.${dup ? ` <b>${dup} já existem</b> (mesmo nº) e serão ignoradas.` : ""}${im.naoMapeadas.length ? `<br><span class="hint">Colunas não reconhecidas (ignoradas): ${im.naoMapeadas.map(esc).join(", ")}</span>` : ""}</p>
      ${tabela(im.itens.slice(0, 15), true, true)}${im.itens.length > 15 ? `<p class="hint">… e mais ${im.itens.length - 15}.</p>` : ""}
      <div class="panel" style="margin-top:12px;background:var(--accent-soft)"><h3>Para onde vão</h3>
        <label class="f" style="flex-direction:row;align-items:center;gap:8px;font-size:14px"><input type="radio" name="impDest" data-impdest="base" ${base ? "checked" : ""} style="width:auto"><b>Base de precatórios</b> (Explorar precatórios) — para filtrar e escolher os alvos depois. Recomendado.</label>
        <label class="f" style="flex-direction:row;align-items:center;gap:8px;font-size:14px;margin-top:6px"><input type="radio" name="impDest" data-impdest="carteira" ${base ? "" : "checked"} style="width:auto">Direto na carteira, como alvos (fase "${esc(S.etapas[0].nome)}")</label>
        ${base ? `<p class="hint" style="margin-top:8px">${grupos.map(g => `<b>${esc(g.tribunal)} — ${esc(g.ente)}</b>: ${g.itens.length} precatório(s)${lmetaDe(g.id) ? " — <b>substitui</b> a lista que já existe com esse nome" : " — lista nova"}`).join("<br>")}</p>` : ""}</div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="confirmaImp">${base ? `Enviar ${im.itens.length} precatório(s) para a base` : `Importar ${im.itens.length - dup} precatório(s) para a carteira`}</button><button class="btn" id="cancelaImp">Descartar</button></div></div>`; }
  return `<h1>Importar planilha</h1><p class="sub">Envie a lista de um tribunal para a base de precatórios. Depois, em Explorar precatórios, filtre e escolha os alvos.</p>
  <div class="two"><div class="panel"><h3>1. Use o modelo</h3><p>Baixe a planilha-modelo, preencha no Excel e salve como CSV. Os nomes das colunas precisam ser mantidos.</p>
    <div class="row"><button class="btn" id="baixarModelo">Baixar planilha-modelo (.csv)</button></div>
    <p class="hint" style="margin-top:10px">Listagens de tribunal em PDF (como as do TRF3) não entram por aqui: envie o arquivo ao Claude, que importa para a base de precatórios.</p></div>
  <div class="panel"><h3>2. Envie o arquivo ou cole do Excel</h3>
    <label class="f">Arquivo CSV<input type="file" id="arq" accept=".csv,.txt,.tsv"></label>
    <label class="f" style="margin-top:10px">Ou copie as linhas no Excel (com o cabeçalho) e cole aqui<textarea id="colar" style="min-height:110px"></textarea></label>
    <div class="row" style="margin-top:8px"><button class="btn primary sm" id="lerColado">Ler dados colados</button></div></div></div>${prev}`;
}
async function oferecerArquivo(nome, conteudo, semBom) {
  if (S.dl) { try { await S.dl.save({filename:nome, data:(semBom ? "" : "\uFEFF") + conteudo}); toast("Arquivo pronto"); return; } catch (e) { if (e.code === "declined") return; } }
  modal(`<h2>Copie o conteúdo</h2><p class="hint">O download não está disponível aqui. Copie e cole num arquivo .csv.</p><textarea style="width:100%;min-height:200px" readonly>${esc(conteudo)}</textarea><div class="row" style="margin-top:10px"><button class="btn" data-close>Fechar</button></div>`);
}
function exportarCSV() {
  const H = COLS_IMP.map(c => c[1]);
  const lin = S.precs.map(p => { const t = (p.titulares || [])[0] || {}, a = p.advogados || [], d = (p.deducoes || []).find(x => x.tipo === "DESTAQUE_CONTRATUAL");
    const v = {...p, titular_nome:t.nome, titular_documento:t.documento, titular_tipo:t.tipo, advogado_nome:a.map(x => x.nome).join(" | "), advogado_oab:a.map(x => x.oab).join(" | "), advogado_contato:a[0] ? [a[0].telefone, a[0].email].filter(Boolean).join(" ") : "",
      destaque_pct:d ? d.percentual : "", etapa:etapaDe(p.etapa).nome, superpreferencia:p.superpreferencia ? "sim" : "não"};
    return COLS_IMP.map(c => { let x = v[c[0]]; if (typeof x === "number") x = fnumIn(x); if (c[0].startsWith("data_") && x) x = fdate(x); return CSV_ESC(x); }).join(";"); });
  oferecerArquivo(`precatorios_${todayISO()}.csv`, [H.join(";"), ...lin].join("\n"));
}

/* ============ índices ============ */
function vIndices() {
  const ks = [...new Set([...Object.keys(S.selic), ...Object.keys(S.ipca)])].sort().reverse();
  return `<h1>Índices de correção</h1><p class="sub">Série mensal usada na estimativa do valor bruto. Cada mês é somado, não capitalizado (art. 3º da EC 113/2021).</p>
  <div class="two"><div class="panel"><h3>Regras em vigor no sistema</h3><table class="casc"><tbody>
    <tr><td>Até 11/2021</td><td>Índice varia por tema. Sistema exige valor atualizado informado.</td></tr>
    ${REGRAS.map(r => `<tr><td class="mono" style="white-space:nowrap">${fdate(r.de + "-01").slice(3)} ${r.ate ? "a " + fdate(r.ate + "-01").slice(3) : "em diante"}</td><td>${esc(r.nome)}<div class="hint">${esc(r.metodo)}</div></td></tr>`).join("")}
  </tbody></table><p class="hint">Fonte: ${esc(S.idxMeta.fonte || "—")}${S.idxMeta.coleta ? ", coletado em " + fdate(S.idxMeta.coleta) : ""}. O mês corrente nunca entra (taxa parcial).</p></div>
  <div class="panel"><h3>Incluir ou corrigir um mês</h3><div class="fgrid">
    <label class="f">Mês<input type="month" id="iMes"></label><label class="f">SELIC do mês (%)<input id="iSelic" inputmode="decimal"></label><label class="f">IPCA do mês (%)<input id="iIpca" inputmode="decimal"></label></div>
    <div class="row" style="margin-top:10px"><button class="btn primary sm" id="salvarIdx">Salvar mês</button></div>
    <p class="hint">SELIC: série 4390 do Banco Central. IPCA: série 433.</p></div></div>
  <div class="tablewrap" style="margin-top:16px;max-height:520px;overflow:auto"><table><thead><tr><th class="nosort">Mês</th><th class="nosort">SELIC</th><th class="nosort">IPCA</th><th class="nosort">IPCA + 2% a.a.</th><th class="nosort">Taxa aplicada</th></tr></thead><tbody>
  ${ks.map(k => { const se = S.selic[k], ip = S.ipca[k]; const pos = k >= "2025-08"; const t = pos && ip != null ? ip + ADJ_2AA : null; const ap = pos ? (t != null && se != null ? Math.min(t, se) : null) : se;
    return `<tr><td class="mono">${fdate(k + "-01").slice(3)}</td><td class="num">${pct(se)}</td><td class="num">${pct(ip)}</td><td class="num">${pos ? pct(t, 4) : "—"}</td><td class="num">${pct(ap, 4)}</td></tr>`; }).join("")}
  </tbody></table></div>`;
}

/* ============ configurações ============ */
function vConfig() {
  const n = id => S.precs.filter(p => p.etapa === id).length;
  const ex = S.precs.filter(p => p.exemplo).length;
  return `<h1>Etapas e ajustes</h1><p class="sub">Crie, renomeie, reordene e pinte as etapas do funil.</p>
  <div class="panel" style="margin-bottom:14px"><h3>Base de precatórios</h3><p class="hint">Se alguma listagem pública dos tribunais (TRF3, TRF5) não aparecer em Explorar precatórios, recarregue.</p><div class="row"><button class="btn" id="recarregarBase">Recarregar listagens públicas</button></div></div>
  <div class="panel"><h3>Etapas do funil</h3><table class="subtable"><thead><tr><th class="nosort">Ordem</th><th class="nosort">Cor</th><th class="nosort">Nome</th><th class="nosort">Encerra?</th><th class="nosort">Precatórios</th><th class="nosort"></th></tr></thead><tbody>
  ${S.etapas.map((e, i) => `<tr><td style="white-space:nowrap"><button class="btn sm" data-up="${i}" ${i ? "" : "disabled"} aria-label="Subir">↑</button> <button class="btn sm" data-down="${i}" ${i < S.etapas.length - 1 ? "" : "disabled"} aria-label="Descer">↓</button></td>
    <td><input type="color" data-ecor="${i}" value="${esc(e.cor)}" style="width:40px;min-width:0;padding:0;height:28px"></td>
    <td><input data-enome="${i}" value="${esc(e.nome)}"></td><td style="text-align:center"><input type="checkbox" data-efinal="${i}" ${e.final ? "checked" : ""} style="width:auto;min-width:0" title="Etapa final (fora do funil ativo)"></td>
    <td class="num">${n(e.id)}</td><td><button class="btn sm danger" data-edel="${i}" ${n(e.id) ? 'disabled title="Mova os precatórios antes de excluir"' : ""}>Excluir</button></td></tr>`).join("")}
  </tbody></table>
  <div class="row" style="margin-top:10px"><input id="novaEtapa" placeholder="Nome da nova etapa" style="padding:7px 10px;border:1px solid var(--line);border-radius:7px;background:var(--surface)"><button class="btn primary sm" id="addEtapa">Criar etapa</button><span class="spacer"></span><button class="btn sm" id="restaurarEtapas">Restaurar etapas-base</button></div>
  <p class="hint">"Encerra?" marca etapas finais (Concluído, Perdido): saem da contagem de negociações ativas.</p></div>
  <div class="panel" style="margin-top:16px"><h3>Exemplos</h3><p>${ex ? `${ex} precatório(s) de exemplo, tirados da carteira do briefing, estão cadastrados para você testar.` : "Nenhum exemplo cadastrado."}</p>
  ${ex ? `<button class="btn danger sm" id="apagarEx">Apagar exemplos</button>` : ""}</div>${vBackup()}`;
}

/* ============ modal ============ */
function modal(html) { $("#overlay").innerHTML = `<div class="modalbg" data-close-bg><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; }
function fechaModal() { $("#overlay").innerHTML = ""; }

/* ============ eventos ============ */
document.addEventListener("click", async ev => {
  if (ev.target.closest("select,input,textarea,summary,label")) return;
  const t = ev.target.closest("button,[data-open],[data-go],th[data-sort],[data-close-bg]"); if (!t) return;
  if (t.hasAttribute("data-close-bg") && ev.target !== t) return;
  const d = t.dataset;
  if (d.closeBg !== undefined || d.close !== undefined) return fechaModal();
  if (d.go) { if (d.go === "novo") { S.draft = novoDraft(); } return go(d.go); }
  if (d.open) { S.tab = "jornada"; return go("ficha", d.open); }
  if (d.sort) { S.sort = {k:d.sort, dir:S.sort.k === d.sort ? -S.sort.dir : 1}; return render(); }
  if (d.tab) { S.tab = d.tab; return render(); }
  if (d.edit) { S.draft = JSON.parse(JSON.stringify(S.precs.find(p => p.id === d.edit))); return go("editar", d.edit); }
  if (d.del) { const p = S.precs.find(x => x.id === d.del);
    return modal(`<h2>Excluir precatório?</h2><p>${esc(titularNome(p))} · <span class="mono">${esc(p.numero_precatorio || "")}</span>. Não dá para desfazer.</p><div class="row"><button class="btn danger" data-delok="${p.id}">Excluir</button><button class="btn" data-close>Cancelar</button></div>`); }
  if (d.delok) { fechaModal(); await excluirPrec(d.delok); toast("Excluído"); return go("lista"); }
  if (d.add) { const k = d.add; const novo = k === "titulares" ? {nome:"", documento:"", tipo:"PF", percentual:null} : k === "advogados" ? {nome:"", oab:"", papel:"", telefone:"", email:""} : {tipo:"DESTAQUE_CONTRATUAL", percentual:null, valor:null, base:"BRUTO", beneficiario:"", status:""};
    (S.draft[k] = S.draft[k] || []).push(novo); return render(); }
  if (d.rm) { S.draft[d.rm].splice(Number(d.i), 1); return render(); }
  if (d.risco) { const p = S.precs.find(x => x.id === S.id); p.riscos[d.risco].resolvido = !p.riscos[d.risco].resolvido; await salvarPrec(p); return render(); }
  if (d.up || d.down) { const i = Number(d.up ?? d.down), j = d.up ? i - 1 : i + 1; [S.etapas[i], S.etapas[j]] = [S.etapas[j], S.etapas[i]]; await salvarEtapas(); return render(); }
  if (d.edel) { S.etapas.splice(Number(d.edel), 1); await salvarEtapas(); return render(); }
  const id = t.id;
  if (id === "cancelar") { S.draft = null; return go(S.id ? "ficha" : "lista", S.id); }
  if (id === "toggleDoc") { S.showDoc = !S.showDoc; return render(); }
  if (id === "exportar") return exportarCSV();
  if (id === "baixarModelo") return oferecerArquivo("modelo_precatorios.csv", COLS_IMP.map(c => c[1]).join(";") + "\n" + ["5000000-00.2026.8.24.0000","TJSC","Estadual","Estado de Santa Catarina","","Especial","Comum","não","1.000.000,00","31/03/2025","","","30/06/2025","","","2027","1234","01/09/2026","Aberto","0000000-00.2020.8.24.0000","","Repetição de indébito","Vara da Fazenda de Florianópolis","Empresa Exemplo Ltda","00.000.000/0001-00","PJ","Fulano de Tal","SC00000","","20","Mapeado","linha de exemplo: apague"].join(";"));
  if (id === "lerColado") { const txt = $("#colar").value; if (!txt.trim()) return toast("Cole os dados primeiro"); const rows = parseTabela(txt); if (rows.length < 2) return toast("Faltam cabeçalho e ao menos uma linha"); S.imp = mapear(rows); return render(); }
  if (id === "cancelaImp") { S.imp = null; return render(); }
  if (id === "devolverBase") { const naBase = new Set(S.lrows.map(r => r.num)); const L = importadosAntigos().filter(p => naBase.has(String(p.numero_precatorio || "").replace(/\D/g, "")));
    return modal(`<h2>Devolver ${L.length} precatório(s) à base?</h2><p>Saem da carteira e da jornada. Continuam na base de precatórios, de onde você pode levá-los de novo para a carteira quando quiser.</p><div class="row"><button class="btn primary" id="devolverBaseOk">Devolver</button><button class="btn" data-close>Cancelar</button></div>`); }
  if (id === "devolverBaseOk") { fechaModal(); const naBase = new Set(S.lrows.map(r => r.num)); const L = importadosAntigos().filter(p => naBase.has(String(p.numero_precatorio || "").replace(/\D/g, "")));
    for (const p of L) await excluirPrec(p.id); toast(L.length + " precatório(s) devolvido(s) à base"); return render(); }
  if (id === "recarregarBase") { if (window.recarregarBase) window.recarregarBase(); return; }
  if (id === "confirmaImp" && S.impDest !== "carteira") return importarParaBase(S.imp.itens);
  if (id === "confirmaImp") { const exist = new Set(S.precs.map(p => p.numero_precatorio).filter(Boolean)); let n = 0;
    for (const p of S.imp.itens) { if (p.numero_precatorio && exist.has(p.numero_precatorio)) continue; p.notas = [{data:new Date().toISOString(), texto:"Importado de planilha", auto:true}]; await salvarPrec(p); exist.add(p.numero_precatorio); n++; }
    S.imp = null; toast(n + " precatório(s) importado(s)"); return go("lista"); }
  if (id === "salvarNeg" || id === "salvarFila") { const p = S.precs.find(x => x.id === S.id); const antes = p.etapa;
    document.querySelectorAll("[data-q]").forEach(el => { const k = el.dataset.q; p[k] = ["fundo_nome","comissao_tipo","etapa","ano_pagamento"].includes(k) ? (el.value || null) : parseNum(el.value); });
    if (antes !== p.etapa) (p.notas = p.notas || []).push({data:new Date().toISOString(), texto:`Etapa: ${etapaDe(antes).nome} → ${etapaDe(p.etapa).nome}`, auto:true});
    await salvarPrec(p); toast("Salvo"); return render(); }
  if (id === "addNota") { const txt = $("#novaNota").value.trim(); if (!txt) return; const p = S.precs.find(x => x.id === S.id); (p.notas = p.notas || []).push({data:new Date().toISOString(), texto:txt, por:S.usuario ? S.usuario.email : undefined}); await salvarPrec(p); return render(); }
  if (id === "addRisco") { const p = S.precs.find(x => x.id === S.id); (p.riscos = p.riscos || []).push({tipo:$("#rTipo").value, severidade:$("#rSev").value, descricao:$("#rDesc").value.trim(), resolvido:false}); await salvarPrec(p); return render(); }
  if (id === "addEtapa") { const nome = $("#novaEtapa").value.trim(); if (!nome) return toast("Dê um nome à etapa"); let base = norm(nome) || "etapa", eid = base, i = 2; while (S.etapas.some(e => e.id === eid)) eid = base + i++;
    const fi = S.etapas.findIndex(e => e.final); const nova = {id:eid, nome, cor:"#5b6b82"}; if (fi >= 0) S.etapas.splice(fi, 0, nova); else S.etapas.push(nova); await salvarEtapas(); toast("Etapa criada"); return render(); }
  if (id === "restaurarEtapas") { const usados = new Set(S.precs.map(p => p.etapa)); const extra = S.etapas.filter(e => usados.has(e.id) && !ETAPAS_BASE.some(b => b.id === e.id)); S.etapas = [...ETAPAS_BASE.filter(b => !b.final), ...extra, ...ETAPAS_BASE.filter(b => b.final)]; await salvarEtapas(); return render(); }
  if (id === "apagarEx") return modal(`<h2>Apagar exemplos?</h2><p>Remove os ${S.precs.filter(p => p.exemplo).length} precatórios de exemplo. Os que você cadastrou ficam.</p><div class="row"><button class="btn danger" id="apagarExOk">Apagar</button><button class="btn" data-close>Cancelar</button></div>`);
  if (id === "apagarExOk") { fechaModal(); for (const p of S.precs.filter(p => p.exemplo)) await excluirPrec(p.id); toast("Exemplos apagados"); return render(); }
  if (id === "salvarIdx") { const m = $("#iMes").value; if (!m) return toast("Escolha o mês"); const se = parseNum($("#iSelic").value), ip = parseNum($("#iIpca").value);
    if (se != null) S.selic[m] = se; if (ip != null) S.ipca[m] = ip; if (se == null && ip == null) return toast("Informe SELIC ou IPCA"); await salvarIndices(); toast("Índice salvo"); return render(); }
});
document.addEventListener("input", ev => {
  const el = ev.target;
  if (el.id === "fq") { S.f.q = el.value; clearTimeout(S._fq); S._fq = setTimeout(() => { const pos = el.selectionStart; render(); const n = $("#fq"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250); return; }
  if (el.dataset.p && S.draft && el.dataset.t !== "num") setPath(S.draft, el.dataset.p, lerCampo(el));
  if (el.dataset.enome != null) { S.etapas[Number(el.dataset.enome)].nome = el.value; clearTimeout(S._et); S._et = setTimeout(salvarEtapas, 700); }
});
document.addEventListener("change", async ev => {
  const el = ev.target;
  if (el.dataset.f) { S.f[el.dataset.f] = el.value; return render(); }
  if (el.dataset.p && S.draft) { setPath(S.draft, el.dataset.p, lerCampo(el)); if (el.dataset.p === "tribunal" && /^TRF/.test(el.value)) { S.draft.esfera = "FEDERAL"; S.draft.regime = S.draft.regime || "GERAL"; render(); } return; }
  if (el.dataset.move) return moverEtapa(el.dataset.move, el.value);
  if (el.dataset.ecor != null) { S.etapas[Number(el.dataset.ecor)].cor = el.value; await salvarEtapas(); return render(); }
  if (el.dataset.efinal != null) { S.etapas[Number(el.dataset.efinal)].final = el.checked; await salvarEtapas(); return render(); }
  if (el.dataset.impdest) { S.impDest = el.dataset.impdest; return render(); }
  if (el.id === "arq" && el.files[0]) { const f = el.files[0]; S.impArq = f.name; const buf = await f.arrayBuffer(); let txt = new TextDecoder("utf-8").decode(buf);
    if (txt.includes("\uFFFD")) txt = new TextDecoder("iso-8859-1").decode(buf); // planilhas do Excel em latin-1
    const rows = parseTabela(txt); if (rows.length < 2) return toast("Arquivo sem linhas de dados"); S.imp = mapear(rows); render(); }
});
document.addEventListener("submit", async ev => {
  if (ev.target.id !== "form") return; ev.preventDefault();
  document.querySelectorAll("#form [data-p]").forEach(el => setPath(S.draft, el.dataset.p, lerCampo(el)));
  const p = S.draft;
  if (!p.numero_precatorio && !p.ente_devedor) return toast("Informe ao menos o nº do precatório ou o ente devedor");
  p.titulares = (p.titulares || []).filter(t => t.nome); p.advogados = (p.advogados || []).filter(a => a.nome); p.deducoes = (p.deducoes || []).filter(d => d.percentual || d.valor);
  const dup = S.precs.find(x => x.id !== p.id && x.numero_precatorio && x.numero_precatorio === p.numero_precatorio);
  if (dup) return toast("Já existe precatório com esse número");
  const novo = !S.precs.some(x => x.id === p.id);
  if (novo) p.notas = [{data:new Date().toISOString(), texto:"Cadastrado", auto:true}];
  if (await salvarPrec(p)) { S.draft = null; S.tab = "jornada"; toast(novo ? "Precatório cadastrado" : "Alterações salvas"); go("ficha", p.id); }
});

/* ============ pesquisa do mapa ============ */
const PF_VAZIO = () => ({faceMin:null, faceMax:null, brutoMin:null, brutoMax:null, exDe:"", exAte:"", posMax:null, natureza:"", esfera:"", tribunal:"", regime:"", ente:"", acao:"", titTipo:"", etapa:"", semGraves:false, concordou:false, semSuper:false, soInteresse:false, texto:""});
S.pf = PF_VAZIO(); S.psel = new Set(); S.psort = {k:"valor_face", dir:-1}; S.pesqSalvas = [];
function pesquisar() {
  const f = S.pf, q = norm(f.texto), ent = norm(f.ente), ac = norm(f.acao);
  const R = [];
  for (const p of S.precs) {
    const face = p.valor_face;
    if (f.faceMin != null && !(face >= f.faceMin)) continue;
    if (f.faceMax != null && !(face <= f.faceMax)) continue;
    if (f.natureza && p.natureza !== f.natureza) continue;
    if (f.esfera && p.esfera !== f.esfera) continue;
    if (f.tribunal && p.tribunal !== f.tribunal) continue;
    if (f.regime && p.regime !== f.regime) continue;
    if (f.etapa && p.etapa !== f.etapa) continue;
    if (f.exDe && !(Number(p.exercicio) >= Number(f.exDe))) continue;
    if (f.exAte && !(Number(p.exercicio) <= Number(f.exAte))) continue;
    if (f.posMax != null && !(p.posicao_fila && p.posicao_fila <= f.posMax)) continue;
    if (ent && !norm(p.ente_devedor).includes(ent)) continue;
    if (ac && !norm(p.tipo_acao).includes(ac)) continue;
    if (f.titTipo && !(p.titulares || []).some(t => t.tipo === f.titTipo)) continue;
    if (f.concordou && p.ente_concordou !== "sim") continue;
    if (f.semSuper && p.superpreferencia) continue;
    if (f.soInteresse && !p.interesse) continue;
    if (q && !norm([p.numero_precatorio, p.processo_origem, p.processo_cumprimento, ...(p.titulares || []).map(t => t.nome + " " + (t.documento || "")), ...(p.advogados || []).map(a => a.nome + " " + (a.oab || ""))].join(" ")).includes(q)) continue;
    const a = analise(p);
    if (f.brutoMin != null && !(a.c.bruto >= f.brutoMin)) continue;
    if (f.brutoMax != null && !(a.c.bruto <= f.brutoMax)) continue;
    const L = alertas(p, a);
    if (f.semGraves && nAltos(L)) continue;
    R.push({p, a, L});
  }
  const k = S.psort.k, d = S.psort.dir;
  const val = x => k === "bruto" ? x.a.c.bruto : k === "titular" ? titularNome(x.p) : k === "etapa" ? S.etapas.findIndex(e => e.id === x.p.etapa) : k === "exercicio" ? Number(x.p.exercicio) || null : x.p[k];
  R.sort((a, b) => { const x = val(a), y = val(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR")) * d; });
  return R;
}
function nFiltros() { const v = PF_VAZIO(); return Object.keys(v).filter(k => S.pf[k] !== v[k] && S.pf[k] !== "" && S.pf[k] != null).length; }
function vPesquisa() {
  const f = S.pf, R = pesquisar();
  for (const id of [...S.psel]) if (!S.precs.some(p => p.id === id)) S.psel.delete(id);
  const somaF = R.reduce((s, x) => s + (x.p.valor_face || 0), 0), somaB = R.reduce((s, x) => s + (x.a.c.bruto || 0), 0), semB = R.filter(x => !x.a.c.bruto).length;
  const sel = R.filter(x => S.psel.has(x.p.id)), todos = R.length && sel.length === R.length;
  const opt = (arr, v) => arr.map(o => `<option value="${esc(o[0])}" ${v === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("");
  const tribs = [...new Set(S.precs.map(p => p.tribunal).filter(Boolean))].sort();
  const nIn = (k, ph) => `<input data-pf="${k}" data-pt="num" inputmode="decimal" placeholder="${ph}" value="${fnumIn(f[k])}">`;
  const chip = (v, l) => `<button class="btn sm ${f.faceMin === v && f.faceMax == null ? "primary" : ""}" data-pchip="${v}">${l}</button>`;
  const chk = (k, l) => `<label class="f" style="flex-direction:row;align-items:center;gap:7px;font-size:13px"><input type="checkbox" data-pf="${k}" data-pt="bool" ${f[k] ? "checked" : ""} style="width:auto">${l}</label>`;
  const arrow = k => S.psort.k === k ? (S.psort.dir > 0 ? " ↑" : " ↓") : "";
  const cols = [["valor_face","Valor de face"],["bruto","Bruto hoje"],["titular","Titular"],["ente_devedor","Ente devedor"],["tribunal","Tribunal"],["natureza","Natureza"],["exercicio","Exercício"],["posicao_fila","Posição"],["etapa","Etapa"]];
  return `<div class="row"><div><h1>Pesquisa no mapa</h1><p class="sub">Filtre a base, marque os que interessam e mande para o funil.</p></div></div>
  <div class="panel" style="margin-bottom:14px">
    <h3>Valor de face</h3>
    <div class="row" style="gap:6px;margin-bottom:10px">${chip(null,"Todos")}${chip(500000,"Acima de R$ 500 mil")}${chip(1000000,"Acima de R$ 1 mi")}${chip(5000000,"Acima de R$ 5 mi")}${chip(10000000,"Acima de R$ 10 mi")}</div>
    <div class="fgrid">
      <label class="f">Valor de face — de (R$)${nIn("faceMin","ex.: 1.000.000,00")}</label>
      <label class="f">Valor de face — até (R$)${nIn("faceMax","sem limite")}</label>
      <label class="f">Bruto hoje — de (R$)${nIn("brutoMin","")}<span class="hint">estimado ou informado</span></label>
      <label class="f">Bruto hoje — até (R$)${nIn("brutoMax","")}</label>
    </div>
    <h3 style="margin-top:16px">Crédito e devedor</h3>
    <div class="fgrid">
      <label class="f">Natureza<select data-pf="natureza"><option value="">Todas</option>${opt([["COMUM","Comum"],["ALIMENTAR","Alimentar"]], f.natureza)}</select></label>
      <label class="f">Esfera<select data-pf="esfera"><option value="">Todas</option>${opt([["FEDERAL","Federal"],["ESTADUAL","Estadual"],["MUNICIPAL","Municipal"]], f.esfera)}</select></label>
      <label class="f">Tribunal<select data-pf="tribunal"><option value="">Todos</option>${opt(tribs.map(t => [t, t]), f.tribunal)}</select></label>
      <label class="f">Regime<select data-pf="regime"><option value="">Todos</option>${opt([["GERAL","Geral"],["ESPECIAL","Especial"]], f.regime)}</select></label>
      <label class="f">Ente devedor contém<input data-pf="ente" data-pt="text" value="${esc(f.ente)}" placeholder="ex.: Joinville"></label>
      <label class="f">Tipo de ação contém<input data-pf="acao" data-pt="text" value="${esc(f.acao)}" placeholder="ex.: desapropriação"></label>
      <label class="f">Tipo de titular<select data-pf="titTipo"><option value="">Todos</option>${opt([["PF","Pessoa física"],["PJ","Pessoa jurídica"],["ESPOLIO","Espólio"],["SOC_ADV","Soc. de advogados"]], f.titTipo)}</select></label>
      <label class="f">Nº, processo, titular, CPF/CNPJ, advogado<input data-pf="texto" data-pt="text" value="${esc(f.texto)}"></label>
    </div>
    <h3 style="margin-top:16px">Fila e negociação</h3>
    <div class="fgrid">
      <label class="f">Exercício — de<input data-pf="exDe" data-pt="text" inputmode="numeric" value="${esc(f.exDe)}" placeholder="2026"></label>
      <label class="f">Exercício — até<input data-pf="exAte" data-pt="text" inputmode="numeric" value="${esc(f.exAte)}" placeholder="2028"></label>
      <label class="f">Posição na fila — até<input data-pf="posMax" data-pt="num" inputmode="numeric" value="${fnumIn(f.posMax)}" placeholder="ex.: 5.000"></label>
      <label class="f">Etapa<select data-pf="etapa"><option value="">Todas</option>${opt(S.etapas.map(e => [e.id, e.nome]), f.etapa)}</select></label>
    </div>
    <div class="row" style="margin-top:12px;gap:18px">${chk("soInteresse","Só os marcados ★")}${chk("semGraves","Sem alertas graves")}${chk("concordou","Ente concordou com a conta")}${chk("semSuper","Excluir superpreferência")}</div>
    <div class="row" style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px">
      <button class="btn" id="pLimpar">Limpar filtros${nFiltros() ? ` (${nFiltros()})` : ""}</button>
      <span class="spacer"></span>
      <select id="pSalvaSel" style="padding:6px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface)"><option value="">Pesquisas salvas…</option>${S.pesqSalvas.map((x, i) => `<option value="${i}">${esc(x.nome)}</option>`).join("")}</select>
      ${S.pesqSalvas.length ? `<button class="btn sm danger" id="pSalvaDel" title="Excluir a pesquisa escolhida">Excluir salva</button>` : ""}
      <input id="pSalvaNome" placeholder="Nome desta pesquisa" style="padding:6px 9px;border:1px solid var(--line);border-radius:7px;background:var(--surface)"><button class="btn sm" id="pSalvar">Salvar pesquisa</button>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="l">Encontrados</div><div class="v">${R.length.toLocaleString("pt-BR")}</div><div class="s">de ${S.precs.length.toLocaleString("pt-BR")} na base</div></div>
    <div class="kpi"><div class="l">Soma do valor de face</div><div class="v">${brlc(somaF)}</div><div class="s">nominal</div></div>
    <div class="kpi"><div class="l">Soma do bruto hoje</div><div class="v">${somaB ? brlc(somaB) : "—"}</div><div class="s">${semB ? semB + " sem cálculo" : "todos calculados"}</div></div>
    <div class="kpi"><div class="l">Selecionados</div><div class="v">${sel.length}</div><div class="s">${brlc(sel.reduce((s, x) => s + (x.p.valor_face || 0), 0))} de face</div></div>
  </div>
  <div class="panel" style="padding:10px 14px;margin-bottom:10px;${sel.length ? "" : "opacity:.6"}"><div class="row" style="gap:8px">
    <b>${sel.length} selecionado(s):</b>
    <button class="btn sm" id="pStar" ${sel.length ? "" : "disabled"}>★ Marcar interesse</button>
    <button class="btn sm" id="pUnstar" ${sel.length ? "" : "disabled"}>Tirar ★</button>
    <select id="pEtapa" ${sel.length ? "" : "disabled"} style="padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface)">${S.etapas.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join("")}</select>
    <button class="btn sm primary" id="pMover" ${sel.length ? "" : "disabled"}>Mover para a etapa</button>
    <button class="btn sm" id="pExport" ${sel.length ? "" : "disabled"}>Exportar selecionados</button>
    <span class="spacer"></span>${sel.length ? `<button class="btn sm" id="pNenhum">Limpar seleção</button>` : ""}
  </div></div>
  ${R.length ? `<div class="tablewrap"><table><thead><tr>
    <th class="nosort" style="width:30px"><input type="checkbox" id="pTodos" ${todos ? "checked" : ""} aria-label="Selecionar todos" style="width:auto"></th><th class="nosort" style="width:30px">★</th>
    ${cols.map(c => `<th data-psort="${c[0]}">${c[1]}${arrow(c[0])}</th>`).join("")}<th class="nosort">Alertas</th></tr></thead><tbody>
    ${R.map(({p, a, L}) => { const e = etapaDe(p.etapa), na = nAltos(L), ck = S.psel.has(p.id);
      return `<tr class="click" data-open="${p.id}" style="${ck ? "background:var(--accent-soft)" : ""}">
      <td><input type="checkbox" data-psel="${p.id}" ${ck ? "checked" : ""} aria-label="Selecionar" style="width:auto"></td>
      <td><button class="btn sm" data-star="${p.id}" aria-label="Interesse" style="border:0;background:none;font-size:16px;padding:0 4px;color:${p.interesse ? "var(--warn)" : "var(--muted)"}">${p.interesse ? "★" : "☆"}</button></td>
      <td class="num"><b>${brl(p.valor_face)}</b><div class="hint">${fdate(p.data_base)}</div></td>
      <td class="num">${brl(a.c.bruto)}<div class="hint">${a.c.modo === "estimado" ? "estimado" : a.c.modo === "informado" ? "informado" : ""}</div></td>
      <td>${esc(titularNome(p))}<div class="mono hint">${esc(p.numero_precatorio || "")}</div>${p.exemplo ? `<div class="tag-ex">exemplo</div>` : ""}</td>
      <td>${esc(p.ente_devedor || "—")}</td><td><span class="pill ${p.esfera === "FEDERAL" ? "fed" : ""}">${esc(p.tribunal || "—")}</span></td>
      <td>${p.natureza === "ALIMENTAR" ? `<span class="pill ok">Alimentar</span>` : "Comum"}${p.superpreferencia ? ` <span class="pill warn">Superpref.</span>` : ""}</td>
      <td class="mono">${esc(p.exercicio || "—")}</td><td class="num">${p.posicao_fila ? p.posicao_fila.toLocaleString("pt-BR") + "º" : "—"}</td>
      <td><span class="row" style="gap:6px;flex-wrap:nowrap"><span class="dot" style="background:${esc(e.cor)}"></span>${esc(e.nome)}</span></td>
      <td>${na ? `<span class="pill bad">${na} grave${na > 1 ? "s" : ""}</span>` : ""}</td></tr>`; }).join("")}
  </tbody></table></div>` : `<div class="panel empty">Nenhum precatório com esses filtros. <button class="btn sm" id="pLimpar2">Limpar filtros</button></div>`}`;
}
async function salvarPesquisas() { if (S.db) { try { await S.db.doc("config/pesquisas").set({lista:S.pesqSalvas}); } catch (e) { toast("Falha ao salvar a pesquisa"); } } }
async function emLote(fn, msg) {
  const ids = [...S.psel]; let n = 0;
  for (const id of ids) { const p = S.precs.find(x => x.id === id); if (!p) continue; if (fn(p) !== false) { await salvarPrec(p); n++; } }
  toast(`${n} ${msg}`); render();
}
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button,th[data-psort]"); if (!t) return;
  const d = t.dataset;
  if (d.psort) { S.psort = {k:d.psort, dir:S.psort.k === d.psort ? -S.psort.dir : (["valor_face","bruto"].includes(d.psort) ? -1 : 1)}; return render(); }
  if (d.pchip !== undefined) { S.pf.faceMin = d.pchip === "null" ? null : Number(d.pchip); S.pf.faceMax = null; return render(); }
  if (d.star) { ev.stopPropagation(); const p = S.precs.find(x => x.id === d.star); p.interesse = !p.interesse; await salvarPrec(p); return render(); }
  if (t.id === "pLimpar" || t.id === "pLimpar2") { S.pf = PF_VAZIO(); return render(); }
  if (t.id === "pNenhum") { S.psel.clear(); return render(); }
  if (t.id === "pStar") return emLote(p => { if (p.interesse) return false; p.interesse = true; }, "marcado(s) com ★");
  if (t.id === "pUnstar") return emLote(p => { if (!p.interesse) return false; p.interesse = false; }, "desmarcado(s)");
  if (t.id === "pMover") { const et = $("#pEtapa").value, nome = etapaDe(et).nome;
    return emLote(p => { if (p.etapa === et) return false; const de = etapaDe(p.etapa).nome; p.etapa = et; (p.notas = p.notas || []).push({data:new Date().toISOString(), texto:`Etapa: ${de} → ${nome} (pela pesquisa)`, auto:true}); }, "movido(s) para " + nome); }
  if (t.id === "pExport") { const guard = S.precs; S.precs = guard.filter(p => S.psel.has(p.id)); try { exportarCSV(); } finally { S.precs = guard; } return; }
  if (t.id === "pSalvar") { const nome = $("#pSalvaNome").value.trim(); if (!nome) return toast("Dê um nome à pesquisa");
    const i = S.pesqSalvas.findIndex(x => x.nome === nome); const item = {nome, filtros:{...S.pf}}; if (i >= 0) S.pesqSalvas[i] = item; else S.pesqSalvas.push(item);
    await salvarPesquisas(); toast("Pesquisa salva"); return render(); }
  if (t.id === "pSalvaDel") { const i = $("#pSalvaSel").value; if (i === "") return toast("Escolha a pesquisa salva a excluir"); S.pesqSalvas.splice(Number(i), 1); await salvarPesquisas(); toast("Pesquisa excluída"); return render(); }
}, true);
document.addEventListener("change", ev => {
  const el = ev.target;
  if (el.dataset.pf) { const k = el.dataset.pf, tp = el.dataset.pt; S.pf[k] = tp === "bool" ? el.checked : tp === "num" ? parseNum(el.value) : el.value.trim(); return render(); }
  if (el.dataset.psel) { if (el.checked) S.psel.add(el.dataset.psel); else S.psel.delete(el.dataset.psel); return render(); }
  if (el.id === "pTodos") { const R = pesquisar(); if (el.checked) R.forEach(x => S.psel.add(x.p.id)); else R.forEach(x => S.psel.delete(x.p.id)); return render(); }
  if (el.id === "pSalvaSel" && el.value !== "") { const x = S.pesqSalvas[Number(el.value)]; if (x) { S.pf = {...PF_VAZIO(), ...x.filtros}; render(); const s = $("#pSalvaSel"); if (s) s.value = el.value; } }
});
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.pf) ev.target.blur(); });

/* ============ listagens dos tribunais (base do mapa) ============ */
S.lmeta = []; S.lrows = []; S.lcarreg = false; S.pmode = "listagens"; S.lpage = 1; S.lsel = new Set();
S.lsort = {k:6, dir:-1};
const LF_VAZIO = () => ({faceMin:null, faceMax:null, lista:"", ente:"", tipoEnte:"", uf:"", natureza:"", pref:"", num:"", naoCarteira:false, comOrig:false, comAdv:false, tribunal:""});
S.lf = LF_VAZIO();
const PREF_TXT = ["Sem preferência", "Superpref. — idoso", "Superpref. — doença grave/deficiência"];
const LPAG = 100;
const fdi = n => { const s = String(n); return `${s.slice(6,8)}/${s.slice(4,6)}/${s.slice(0,4)}`; };
const fnum20 = n => n.length === 20 ? `${n.slice(0,7)}-${n.slice(7,9)}.${n.slice(9,13)}.${n.slice(13,14)}.${n.slice(14,16)}.${n.slice(16)}` : n;
function lmetaDe(id) { return S.lmeta.find(m => m.id === id); }
function vencida(m) { return m.proposta < new Date().getFullYear() + 1 && m.esfera === "FEDERAL" && m.proposta <= new Date().getFullYear(); }
function classificaEnte(nome) {
  const orig = String(nome || "").replace(/[\s_.]+$/, ""), k = norm(orig);
  const R = (n, t) => ({nome:n, tipo:t, orig});
  if (k.includes("encargosfinanceirosdauniao") || k === "uniao" || k === "uniaofederal") return R("União Federal", "União (administração direta)");
  if (k.includes("fundodoregimegeraldeprevidencia") || k.includes("institutonacionaldosegurosocial")) return R("INSS", "Autarquia federal");
  if (k.includes("fundonacionaldeassistenciasocial")) return R("União Federal (FNAS)", "União (fundo)");
  if (k.includes("fundodeamparoaotrabalhador")) return R("União Federal (FAT)", "União (fundo)");
  if (k.includes("fundonacionaldesaude")) return R("União Federal (FNS)", "União (fundo)");
  if (/^(valec|companhiabrasileiradetrens|empresabrasileiradeservicos|caixadeconstrucao)/.test(k)) return R(orig, "Empresa pública federal");
  if (/^(fundacao|funasa|fiocruz|fundacentro|ibge|univasf)/.test(k) || k.includes("fundacao")) return R(orig, "Fundação pública federal");
  return R(orig, "Autarquia federal");
}
async function carregarListagens() {
  if (!S.db) return;
  try {
    const q = await S.db.collection("listagem_itens").limit(1000).get();
    const out = [];
    for (const d of q.docs) { const b = d.data(); const m = lmetaDe(b.listagem); if (!m) continue;
      const cl = m.entidades.map(x => m.esfera === "FEDERAL" ? classificaEnte(x) : {nome:String(x).replace(/[\s_.]+$/, ""), tipo:"", orig:String(x)}); for (const r of b.rows) { const x = r[10] || {}; out.push({num:r[0], ent:cl[r[1]].nome, entTipo:cl[r[1]].tipo, entOrig:cl[r[1]].orig, entN:norm(cl[r[1]].nome), orig:r[7] || "", dep:(m.deprecantes && r[8] != null) ? m.deprecantes[r[8]] : "", prc:r[9] || "", uf:r[9] ? String(r[9]).slice(-2) : (m.uf || ""), nat:r[2], pref:r[3], ordem:r[4], data:r[5], valor:r[6], lista:m.id, adv:x.adv || [], obs:x.obs || "", sit:x.sit || "", cert:x.cert || ""}); } }
    S.lrows = out; S.lcarreg = true; if (S.view === "pesquisa") render();
  } catch (e) { toast("Falha ao carregar as listagens: " + (e.code || e.message)); }
}
function filtrarListagens() {
  const f = S.lf, q = (f.num || "").replace(/\D/g, ""), en = norm(f.ente);
  const naCart = new Set(S.precs.map(p => String(p.numero_precatorio || "").replace(/\D/g, "")));
  const R = S.lrows.filter(r => (!f.lista || r.lista === f.lista) && (f.faceMin == null || r.valor >= f.faceMin) && (f.faceMax == null || r.valor <= f.faceMax)
    && (!en || r.entN === en) && (!f.tipoEnte || r.entTipo === f.tipoEnte) && (f.natureza === "" || String(r.nat) === f.natureza)
    && (f.pref === "" || (f.pref === "sem" ? r.pref === 0 : String(r.pref) === f.pref)) && (!f.uf || r.uf === f.uf) && (!q || r.num.includes(q) || r.orig.replace(/\D/g, "").includes(q)) && (!f.naoCarteira || !naCart.has(r.num)) && (!f.comOrig || r.orig) && (!f.comAdv || r.adv.length) && (!f.tribunal || (lmetaDe(r.lista) || {}).tribunal === f.tribunal));
  const k = S.lsort.k, d = S.lsort.dir;
  const key = {6:"valor", 4:"ordem", 5:"data", 1:"entN"}[k] || "valor";
  R.sort((a, b) => (typeof a[key] === "number" ? a[key] - b[key] : a[key].localeCompare(b[key])) * d);
  return {R, naCart};
}
function vListagens() {
  const f = S.lf;
  if (!S.lmeta.length) return `<div class="panel empty">Nenhuma listagem de tribunal carregada ainda. Envie o PDF ou a planilha da lista ao Claude para ele importar.</div>`;
  if (!S.lcarreg) return `<div class="panel empty">Carregando ${S.lmeta.reduce((s, m) => s + m.qtd, 0).toLocaleString("pt-BR")} precatórios das listagens…</div>`;
  const {R, naCart} = filtrarListagens();
  const pags = Math.max(1, Math.ceil(R.length / LPAG)); if (S.lpage > pags) S.lpage = pags;
  const pg = R.slice((S.lpage - 1) * LPAG, S.lpage * LPAG);
  const soma = R.reduce((s, r) => s + r.valor, 0), nSup = R.filter(r => r.pref).length;
  const selR = S.lrows.filter(r => S.lsel.has(r.num));
  const ents = [...new Map(S.lrows.filter(r => !f.lista || r.lista === f.lista).map(r => [r.entN, r.ent])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const opt = (arr, v) => arr.map(o => `<option value="${esc(o[0])}" ${String(v) === String(o[0]) ? "selected" : ""}>${esc(o[1])}</option>`).join("");
  const chip = (v, l) => `<button class="btn sm ${f.faceMin === v && f.faceMax == null ? "primary" : ""}" data-lchip="${v}">${l}</button>`;
  const naR = new Set(R.map(r => r.lista)); const avisos = S.lmeta.filter(m => naR.has(m.id) && vencida(m));
  const arrow = k => S.lsort.k === k ? (S.lsort.dir > 0 ? " ↑" : " ↓") : "";
  const todosPg = pg.length && pg.every(r => S.lsel.has(r.num));
  return `<div class="panel" style="margin-bottom:14px">
    <h3>Valor inscrito</h3>
    <div class="row" style="gap:6px;margin-bottom:10px">${chip(null,"Todos")}${chip(500000,"Acima de R$ 500 mil")}${chip(1000000,"Acima de R$ 1 mi")}${chip(5000000,"Acima de R$ 5 mi")}${chip(10000000,"Acima de R$ 10 mi")}</div>
    <div class="fgrid">
      <label class="f">Valor — de (R$)<input data-lf="faceMin" data-pt="num" inputmode="decimal" value="${fnumIn(f.faceMin)}" placeholder="ex.: 1.000.000,00"></label>
      <label class="f">Valor — até (R$)<input data-lf="faceMax" data-pt="num" inputmode="decimal" value="${fnumIn(f.faceMax)}" placeholder="sem limite"></label>
      <label class="f">Listagem<select data-lf="lista"><option value="">Todas</option>${opt(S.lmeta.slice().sort((a, b) => a.tribunal.localeCompare(b.tribunal) || b.proposta - a.proposta).map(m => [m.id, `${lnome(m)} (${m.qtd.toLocaleString("pt-BR")})`]), f.lista)}</select></label>
      <label class="f">Tribunal (jurisdição)<select data-lf="tribunal"><option value="">Todos</option>${opt([...new Set(S.lmeta.map(m => m.tribunal))].sort().map(t => [t, nomeTrib(t)]), f.tribunal)}</select></label>
      <label class="f">Ente devedor<select data-lf="ente"><option value="">Todos</option>${opt(ents, f.ente ? norm(f.ente) : "")}</select></label>
      <label class="f">Tipo de ente<select data-lf="tipoEnte"><option value="">Todos</option>${opt([...new Set(S.lrows.map(r => r.entTipo).filter(Boolean))].sort().map(t => [t, t]), f.tipoEnte)}</select></label>
      <label class="f">Natureza<select data-lf="natureza"><option value="">Todas</option>${opt([["1","Alimentar"],["0","Comum"]], f.natureza)}</select></label>
      <label class="f">Preferência<select data-lf="pref"><option value="">Todas</option>${opt([["sem","Sem superpreferência (transferível)"],["1","Maior de 60 anos"],["2","Doença grave/deficiência"]], f.pref)}</select><span class="hint">superpreferência não passa ao fundo</span></label>
      ${S.lrows.some(r => r.uf) ? `<label class="f">UF de origem<select data-lf="uf"><option value="">Todas</option>${opt([...new Set(S.lrows.map(r => r.uf).filter(Boolean))].sort().map(u => [u, u]), f.uf)}</select></label>` : ""}
      <label class="f">Nº do precatório ou do processo de origem contém<input data-lf="num" data-pt="text" value="${esc(f.num)}"></label>
    </div>
    <div class="row" style="margin-top:12px;gap:18px"><label class="f" style="flex-direction:row;align-items:center;gap:7px;font-size:13px"><input type="checkbox" data-lf="naoCarteira" data-pt="bool" ${f.naoCarteira ? "checked" : ""} style="width:auto">Esconder os que já estão na carteira</label>
      <label class="f" style="flex-direction:row;align-items:center;gap:7px;font-size:13px"><input type="checkbox" data-lf="comOrig" data-pt="bool" ${f.comOrig ? "checked" : ""} style="width:auto">Só com processo de origem</label>
      <label class="f" style="flex-direction:row;align-items:center;gap:7px;font-size:13px"><input type="checkbox" data-lf="comAdv" data-pt="bool" ${f.comAdv ? "checked" : ""} style="width:auto">Só com advogado</label>
      <span class="spacer"></span>${f.lista && (lmetaDe(f.lista) || {}).importada ? `<button class="btn sm danger" data-lexcluir="${esc(f.lista)}">Excluir esta lista</button>` : ""}<button class="btn" id="lLimpar">Limpar filtros</button></div>
  </div>
  ${avisos.map(m => `<div class="alert media"><div><b>Proposta ${m.proposta}: confirme se ainda está em aberto</b>O prazo constitucional para pagar a proposta ${m.proposta} ${m.proposta < new Date().getFullYear() ? "venceu em 31/12/" + m.proposta : "é 31/12/" + m.proposta + " e o pagamento pode já ter ocorrido"}. A União costuma pagar no prazo, então a maioria destes deve estar paga. A listagem é uma fotografia de ${fdate(m.data_ordem)}.</div></div>`).join("")}
  <div class="kpis">
    <div class="kpi"><div class="l">Encontrados</div><div class="v">${R.length.toLocaleString("pt-BR")}</div><div class="s">de ${S.lrows.length.toLocaleString("pt-BR")} na base</div></div>
    <div class="kpi"><div class="l">Soma do valor inscrito</div><div class="v">${brlc(soma)}</div><div class="s">${R.length ? "médio " + brlc(soma / R.length) : ""}</div></div>
    <div class="kpi"><div class="l">Com superpreferência</div><div class="v">${nSup.toLocaleString("pt-BR")}</div><div class="s">${R.length ? pct(nSup / R.length * 100, 0) + " do resultado" : ""}</div></div>
    <div class="kpi"><div class="l">Selecionados</div><div class="v">${selR.length}</div><div class="s">${brlc(selR.reduce((s, r) => s + r.valor, 0))}</div></div>
  </div>
  <div class="panel" style="padding:10px 14px;margin-bottom:10px;${selR.length ? "" : "opacity:.6"}"><div class="row" style="gap:8px">
    <b>${selR.length} selecionado(s):</b>
    <button class="btn sm primary" id="lLevar" ${selR.length ? "" : "disabled"}>Levar para a carteira</button>
    <button class="btn sm" id="lExport" ${selR.length ? "" : "disabled"}>Exportar selecionados</button>
    <span class="spacer"></span>${selR.length ? `<button class="btn sm" id="lNenhum">Limpar seleção</button>` : ""}
  </div></div>
  ${R.length ? `<div class="tablewrap"><table><thead><tr>
    <th class="nosort" style="width:30px"><input type="checkbox" id="lTodosPg" ${todosPg ? "checked" : ""} aria-label="Selecionar esta página" style="width:auto"></th>
    <th data-lsort="6">Valor inscrito${arrow(6)}</th><th class="nosort">Nº do precatório</th><th class="nosort">Processo de origem</th><th data-lsort="1">Ente devedor${arrow(1)}</th><th class="nosort">Natureza</th><th class="nosort">Preferência</th>
    <th class="nosort">Advogado</th><th data-lsort="4">Ordem${arrow(4)}</th><th data-lsort="5">Apresentação${arrow(5)}</th><th class="nosort">Listagem</th><th class="nosort">Carteira</th></tr></thead><tbody>
    ${pg.map(r => { const m = lmetaDe(r.lista), ck = S.lsel.has(r.num), cart = naCart.has(r.num);
      return `<tr style="${ck ? "background:var(--accent-soft)" : ""}">
      <td><input type="checkbox" data-lsel="${r.num}" ${ck ? "checked" : ""} aria-label="Selecionar" style="width:auto"></td>
      <td class="num"><b>${brl(r.valor)}</b></td>
      <td class="mono" style="white-space:nowrap">${fnum20(r.num)} <button class="btn sm" data-copy="${fnum20(r.num)}" title="Copiar número" style="padding:1px 6px">copiar</button>${r.prc ? `<div class="hint mono">${esc(r.prc)}</div>` : ""}</td>
      <td>${r.orig ? `<span class="mono" style="white-space:nowrap">${esc(r.orig)}</span> <button class="btn sm" data-copy="${esc(r.orig)}" title="Copiar processo de origem" style="padding:1px 6px">copiar</button>${r.cert ? `<div class="hint">${esc(r.cert)}</div>` : ""}${r.dep ? `<div class="hint">${esc(r.dep)}</div>` : ""}` : `<span class="hint">${m.importada ? "não encontrado" : "não publicado"}</span>${r.dep ? `<div class="hint">${esc(r.dep)}</div>` : ""}`}${/ATENÇÃO|penhora|cessão|rescisória|inventário/i.test(r.obs) ? `<div><span class="pill warn" title="${esc(r.obs)}">alerta</span></div>` : ""}</td>
      <td title="${esc(r.entOrig || "")}">${esc(r.ent)}${r.entTipo ? `<div class="hint">${esc(r.entTipo)}</div>` : ""}</td><td>${r.nat ? `<span class="pill ok">Alimentar</span>` : "Comum"}</td>
      <td>${r.pref ? `<span class="pill warn">${r.pref === 1 ? "60+ anos" : "Doença grave/def."}</span>` : `<span class="hint">—</span>`}</td>
      <td style="font-size:12.5px">${r.adv.length ? r.adv.slice(0, 2).map(a => `${esc(a.n)}<div class="hint mono">OAB ${esc(a.o)}</div>`).join("") + (r.adv.length > 2 ? `<div class="hint">+${r.adv.length - 2}</div>` : "") : `<span class="hint">—</span>`}</td>
      <td class="num">${r.ordem.toLocaleString("pt-BR")}º</td><td class="mono">${r.data ? fdi(r.data) : ""}</td>
      <td><span class="pill fed">${esc(m.tribunal)}</span> <span class="mono">${m.importada ? "" : m.proposta}</span></td>
      <td>${cart ? `<span class="pill ok">na carteira</span>` : ""}</td></tr>`; }).join("")}
  </tbody></table></div>
  <div class="row" style="margin-top:10px"><span class="hint">Mostrando ${((S.lpage - 1) * LPAG + 1).toLocaleString("pt-BR")}–${Math.min(S.lpage * LPAG, R.length).toLocaleString("pt-BR")} de ${R.length.toLocaleString("pt-BR")}</span><span class="spacer"></span>
    <button class="btn sm" data-lpg="${S.lpage - 1}" ${S.lpage > 1 ? "" : "disabled"}>← Anterior</button><span class="mono">${S.lpage}/${pags}</span><button class="btn sm" data-lpg="${S.lpage + 1}" ${S.lpage < pags ? "" : "disabled"}>Próxima →</button></div>
  <p class="hint">As listagens não trazem o titular (vedação do art. 12, §3º, da Res. CNJ 303/2019). Passe o mouse em "alerta" para ver o motivo. Copie o número e consulte o processo para identificar titular e advogados.</p>`
  : `<div class="panel empty">Nenhum precatório com esses filtros.</div>`}`;
}
function vPesquisaWrap() {
  const tabs = `<div class="row"><div><h1>Explorar precatórios</h1><p class="sub">${S.pmode === "listagens" ? "Base com as listas dos tribunais e as planilhas importadas. Filtre, selecione e leve os alvos para a carteira." : "Precatórios já cadastrados na sua carteira."}</p></div></div>
  <div class="tabs" role="tablist" style="margin-top:0"><button class="tab" data-pmode="listagens" aria-selected="${S.pmode === "listagens"}">Base de precatórios (${S.lmeta.reduce((s, m) => s + m.qtd, 0).toLocaleString("pt-BR")})</button><button class="tab" data-pmode="carteira" aria-selected="${S.pmode === "carteira"}">Minha carteira (${S.precs.length})</button></div>`;
  if (S.pmode === "listagens") return tabs + vListagens();
  return tabs + vPesquisa().replace(/^<div class="row"><div><h1>Pesquisa no mapa<\/h1>.*?<\/div><\/div>/s, "");
}
function importadosAntigos() {
  return S.precs.filter(p => p.etapa === S.etapas[0].id && (p.notas || []).length && (p.notas || []).every(n => n.auto && /Importado de planilha/.test(n.texto)));
}
function bannerDevolver() {
  const L = importadosAntigos(); if (!L.length) return "";
  if (!S.lcarreg) return "";
  const naBase = new Set(S.lrows.map(r => r.num)); const ok = L.filter(p => naBase.has(String(p.numero_precatorio || "").replace(/\D/g, "")));
  return `<div class="alert media" style="margin-bottom:14px"><div><b>${L.length} precatório(s) entraram na carteira pela importação antiga</b>
    ${ok.length ? `Eles já estão na base de precatórios. Devolvendo, saem da carteira e da jornada e ficam só na base, para você escolher depois.
    <div class="row" style="margin-top:8px"><button class="btn sm primary" id="devolverBase">Devolver ${ok.length} à base</button></div>`
    : `Importe antes a lista completa na base (Importar planilha) para poder devolvê-los.`}</div></div>`;
}
const UF_NOME = {AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal e Territórios",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
function nomeTrib(t) { let m = /^TJ([A-Z]{2})$/.exec(t); if (m && UF_NOME[m[1]]) return `${t} — Tribunal de Justiça ${m[1] === "DF" ? "do" : "de"} ${UF_NOME[m[1]]}`;
  m = /^TRF(\d)$/.exec(t); if (m) return `${t} — Tribunal Regional Federal da ${m[1]}ª Região`; m = /^TRT(\d+)$/.exec(t); if (m) return `${t} — Tribunal Regional do Trabalho da ${m[1]}ª Região`; return t; }
function lnome(m) { return m.importada ? `${m.tribunal} — ${m.nome}` : `${m.tribunal} — proposta ${m.proposta}`; }
const slug = s => norm(s).slice(0, 40);
function gruposImport(itens) {
  const g = new Map();
  for (const p of itens) { const trib = (p.tribunal || "").toUpperCase().trim() || "SEM TRIBUNAL", ente = (p.ente_devedor || "").trim() || "Ente não informado";
    const id = "imp-" + slug(trib) + "-" + slug(ente); if (!g.has(id)) g.set(id, {id, tribunal:trib, ente, esfera:p.esfera, itens:[]}); g.get(id).itens.push(p); }
  return [...g.values()];
}
const ymd = d => d ? Number(String(d).slice(0, 10).replace(/-/g, "")) : 0;
async function apagarLista(id) {
  const m = lmetaDe(id); const n = (m && m.chunks) || 0;
  for (let i = 0; i < n; i++) await S.db.collection("listagem_itens").doc(`${id}-c${String(i).padStart(2, "0")}`).delete();
  await S.db.collection("listagens").doc(id).delete();
}
async function importarParaBase(itens) {
  const grupos = gruposImport(itens); let total = 0, ultimo = "";
  toast("Enviando para a base…");
  try {
    for (const g of grupos) {
      if (lmetaDe(g.id)) await apagarLista(g.id);
      const deps = [], depIx = {}; const rows = g.itens.map((p, i) => {
        const dep = (p.juizo_origem || "").trim(); let di = null; if (dep) { if (depIx[dep] == null) { depIx[dep] = deps.length; deps.push(dep); } di = depIx[dep]; }
        const obs = p.observacoes || ""; const cert = (obs.match(/Origem: ([a-záéíóúç]+)\./i) || [])[1] || "";
        return [String(p.numero_precatorio || "").replace(/\D/g, "") || String(p.numero_precatorio || ""), 0, p.natureza === "ALIMENTAR" ? 1 : 0, p.superpreferencia ? 1 : 0, p.posicao_fila || i + 1,
          ymd(p.data_apresentacao), p.valor_atualizado_informado || p.valor_face || 0, p.processo_origem || "", di, "",
          {adv:(p.advogados || []).map(a => ({n:a.nome, o:a.oab})), obs, sit:p.situacao || "", cert:cert ? cert[0].toUpperCase() + cert.slice(1) : ""}]; });
      const TAM = 2000, chunks = Math.ceil(rows.length / TAM);
      for (let c = 0; c < chunks; c++) await S.db.collection("listagem_itens").doc(`${g.id}-c${String(c).padStart(2, "0")}`).set({listagem:g.id, i:c, rows:rows.slice(c * TAM, (c + 1) * TAM)});
      const datas = g.itens.map(p => p.data_posicao || p.data_valor_atualizado).filter(Boolean).sort();
      const anos = g.itens.map(p => Number(p.exercicio)).filter(Boolean);
      const uf = (/^TJ([A-Z]{2})$/.exec(g.tribunal) || [])[1] || "";
      await S.db.collection("listagens").doc(g.id).set({id:g.id, tribunal:g.tribunal, esfera:g.esfera || "ESTADUAL", nome:g.ente, importada:true, uf, proposta:anos.length ? Math.max(...anos) : new Date().getFullYear(),
        tipo:"Planilha importada", data_ordem:datas.length ? datas[datas.length - 1] : todayISO(), arquivo:S.impArq || "planilha", fonte:`Planilha importada por ${S.usuario ? S.usuario.email : "sócio"} em ${fdate(todayISO())}`,
        qtd:rows.length, total:rows.reduce((s, r) => s + r[6], 0), entidades:[g.ente], deprecantes:deps, chunks});
      total += rows.length; ultimo = g.id;
    }
  } catch (e) { return toast("Falha ao enviar para a base: " + (e.message || e)); }
  S.imp = null; S.impArq = null; toast(`${total.toLocaleString("pt-BR")} precatório(s) na base`);
  S.lf = LF_VAZIO(); if (grupos.length === 1) S.lf.lista = ultimo; S.pmode = "listagens"; S.lpage = 1; return go("pesquisa");
}
async function levarParaCarteira() {
  const exist = new Set(S.precs.map(p => String(p.numero_precatorio || "").replace(/\D/g, "")));
  const itens = S.lrows.filter(r => S.lsel.has(r.num) && !exist.has(r.num));
  if (!itens.length) return toast("Os selecionados já estão na carteira");
  let n = 0;
  for (const r of itens) {
    const m = lmetaDe(r.lista), p = novoDraft();
    if (m.importada) { Object.assign(p, {numero_precatorio:fnum20(r.num), tribunal:m.tribunal, esfera:m.esfera, ente_devedor:r.ent, natureza:r.nat ? "ALIMENTAR" : "COMUM", superpreferencia:!!r.pref,
        valor_atualizado_informado:r.valor, data_valor_atualizado:m.data_ordem, processo_origem:r.orig || "", juizo_origem:r.dep || "", exercicio:m.proposta ? String(m.proposta) : "", posicao_fila:r.ordem, data_posicao:m.data_ordem,
        data_apresentacao:r.data ? `${String(r.data).slice(0,4)}-${String(r.data).slice(4,6)}-${String(r.data).slice(6,8)}` : "", titulares:[], origem_listagem:m.id,
        advogados:r.adv.map(a => ({nome:a.n, oab:a.o, papel:"", telefone:"", email:""})), observacoes:r.obs || ""});
      p.notas = [{data:new Date().toISOString(), texto:`Trazido da base: ${lnome(m)} (ordem ${r.ordem}º)`, auto:true}];
      await salvarPrec(p); n++; continue; }
    Object.assign(p, {numero_precatorio:fnum20(r.num), tribunal:m.tribunal, esfera:m.esfera, ente_devedor:r.ent, regime:"GERAL", natureza:r.nat ? "ALIMENTAR" : "COMUM",
      superpreferencia:!!r.pref, valor_face:r.valor, processo_origem:r.orig || "", juizo_origem:r.dep || "", exercicio:String(m.proposta), posicao_fila:r.ordem, data_posicao:m.data_ordem,
      data_apresentacao:`${String(r.data).slice(0,4)}-${String(r.data).slice(4,6)}-${String(r.data).slice(6,8)}`, titulares:[], origem_listagem:m.id,
      observacoes:`Origem: ${m.fonte}, proposta ${m.proposta} (${m.arquivo}). Devedor: ${r.ent} (${r.entTipo}); rubrica orçamentária: ${r.entOrig}. ${r.orig ? "Processo de origem publicado pelo tribunal: " + r.orig + (r.dep ? " (" + r.dep + ")" : "") + ". Titular e advogados: consultar no processo de origem." : "Processo de origem, titular e advogados: consultar pelo nº do precatório."} Valor inscrito na proposta; data-base a confirmar no ofício requisitório.${r.pref ? " Superpreferência: " + PREF_TXT[r.pref] + "." : ""}`});
    p.notas = [{data:new Date().toISOString(), texto:`Trazido da listagem ${m.tribunal} ${m.proposta} (ordem ${r.ordem}º)`, auto:true}];
    await salvarPrec(p); n++;
  }
  S.lsel.clear(); toast(`${n} precatório(s) levado(s) para a carteira`); render();
}
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button,th[data-lsort]"); if (!t) return;
  const d = t.dataset;
  if (d.pmode) { S.pmode = d.pmode; return render(); }
  if (d.lsort) { const k = Number(d.lsort); S.lsort = {k, dir:S.lsort.k === k ? -S.lsort.dir : (k === 6 ? -1 : 1)}; S.lpage = 1; return render(); }
  if (d.lchip !== undefined) { S.lf.faceMin = d.lchip === "null" ? null : Number(d.lchip); S.lf.faceMax = null; S.lpage = 1; return render(); }
  if (d.lpg) { S.lpage = Number(d.lpg); render(); window.scrollTo(0, 0); return; }
  if (d.copy) { try { await navigator.clipboard.writeText(d.copy); toast("Número copiado"); } catch (e) { toast(d.copy); } return; }
  if (t.id === "lLimpar") { S.lf = LF_VAZIO(); S.lpage = 1; return render(); }
  if (d.lexcluir) { const m = lmetaDe(d.lexcluir); return modal(`<h2>Excluir a lista ${esc(lnome(m))}?</h2><p>Sai da base os ${m.qtd.toLocaleString("pt-BR")} precatórios desta lista. Os que você já levou para a carteira continuam lá. Para trazer de volta, importe a planilha de novo.</p><div class="row"><button class="btn danger" data-lexcluirok="${esc(m.id)}">Excluir</button><button class="btn" data-close>Cancelar</button></div>`); }
  if (d.lexcluirok) { fechaModal(); await apagarLista(d.lexcluirok); S.lf.lista = ""; toast("Lista excluída"); return render(); }
  if (t.id === "lNenhum") { S.lsel.clear(); return render(); }
  if (t.id === "lLevar") return levarParaCarteira();
  if (t.id === "lExport") { const rows = S.lrows.filter(r => S.lsel.has(r.num));
    const csv = ["Nº do precatório;Processo de origem;Juízo de origem;Ente devedor;Natureza;Preferência;Valor inscrito;Ordem;Data;Tribunal;Proposta", ...rows.map(r => { const m = lmetaDe(r.lista);
      return [fnum20(r.num), r.orig, r.dep, r.ent, r.nat ? "Alimentar" : "Comum", PREF_TXT[r.pref], fnumIn(r.valor), r.ordem, fdi(r.data), m.tribunal, m.proposta].map(CSV_ESC).join(";"); })].join("\n");
    return oferecerArquivo(`listagem_selecionados_${todayISO()}.csv`, csv); }
}, true);
document.addEventListener("change", ev => {
  const el = ev.target;
  if (el.dataset.lf) { const k = el.dataset.lf, tp = el.dataset.pt; S.lf[k] = tp === "bool" ? el.checked : tp === "num" ? parseNum(el.value) : el.value.trim(); S.lpage = 1; return render(); }
  if (el.dataset.lsel) { if (el.checked) S.lsel.add(el.dataset.lsel); else S.lsel.delete(el.dataset.lsel); return render(); }
  if (el.id === "lTodosPg") { const {R} = filtrarListagens(); R.slice((S.lpage - 1) * LPAG, S.lpage * LPAG).forEach(r => el.checked ? S.lsel.add(r.num) : S.lsel.delete(r.num)); return render(); }
});
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.lf) ev.target.blur(); });

/* ============ cópia de segurança ============ */
const COLS_BACKUP = ["precatorios", "listagens", "listagem_itens", "config", "indices"];
async function gerarBackup() {
  if (!S.db) return toast("Sem conexão com os dados");
  toast("Gerando cópia…");
  const out = {versao:1, gerado:new Date().toISOString(), docs:{}};
  for (const c of COLS_BACKUP) { const q = await S.db.collection(c).limit(1000).get(); out.docs[c] = q.docs.map(d => ({id:d.id, data:d.data()})); }
  const n = Object.values(out.docs).reduce((s, a) => s + a.length, 0);
  await oferecerArquivo(`backup_mesa_precatorios_${todayISO()}.json`, JSON.stringify(out), true);
  return n;
}
async function restaurarBackup(file) {
  let b; try { b = JSON.parse(await file.text()); } catch (e) { return toast("Arquivo de cópia inválido"); }
  if (!b || !b.docs) return toast("Arquivo de cópia inválido");
  let n = 0; const tot = Object.values(b.docs).reduce((s, a) => s + a.length, 0);
  for (const c of COLS_BACKUP) for (const d of (b.docs[c] || [])) { await S.db.collection(c).doc(d.id).set(d.data); n++; if (n % 5 === 0) toast(`Restaurando ${n}/${tot}…`); }
  toast(`${n} registro(s) restaurado(s)`); S.lcarreg = false; carregarListagens(); render();
}
function vBackup() {
  return `<div class="panel" style="margin-top:16px"><h3>Cópia de segurança</h3>
  <p>Baixa tudo (carteira, etapas, pesquisas salvas, índices e listagens) num único arquivo. Serve para guardar uma cópia e para levar os dados para outra instalação do app.</p>
  <div class="row"><button class="btn" id="bkBaixar">Baixar cópia completa</button>
  <label class="btn" style="cursor:pointer">Restaurar de um arquivo<input type="file" id="bkArq" accept=".json" hidden></label></div>
  <p class="hint">Restaurar grava por cima dos registros com o mesmo identificador e mantém os demais.</p></div>`;
}
document.addEventListener("click", ev => { const t = ev.target.closest("#bkBaixar"); if (t) gerarBackup(); });
document.addEventListener("change", ev => { if (ev.target.id === "bkArq" && ev.target.files[0]) restaurarBackup(ev.target.files[0]); });

/* ============ jornada dos negócios ============ */
S.jq = ""; S.jtodas = false;
const etapaIdx = id => S.etapas.findIndex(e => e.id === id);
const etapasJornada = () => S.etapas.filter(e => e.id !== "perdido");
const diasDesde = iso => iso ? Math.max(0, Math.floor((Date.now() - new Date(iso)) / 864e5)) : null;
function proximaEtapa(p) { const L = etapasJornada(), i = L.findIndex(e => e.id === p.etapa); return i >= 0 && i < L.length - 1 ? L[i + 1] : null; }
function etapaAnterior(p) { const L = etapasJornada(), i = L.findIndex(e => e.id === p.etapa); return i > 0 ? L[i - 1] : null; }
function progresso(p) {
  const L = etapasJornada(), i = L.findIndex(e => e.id === p.etapa);
  return `<div class="trilha" aria-label="Fase ${i + 1} de ${L.length}">${L.map((e, k) => `<span class="${k < i ? "feito" : k === i ? "atual" : ""}" style="--c:${esc(e.cor)}" title="${esc(e.nome)}"></span>`).join("")}</div>`;
}
function cardJornada(p) {
  const e = etapaDe(p.etapa), nx = proximaEtapa(p), ant = etapaAnterior(p), d = diasDesde(p.etapa_desde || p.atualizado);
  const tit = (p.titulares || [])[0] ? titularNome(p) : "Titular a identificar";
  return `<article class="jcard" draggable="true" data-card="${p.id}" style="--c:${esc(e.cor)}">
    <div class="jc-top" data-open="${p.id}">
      <div class="jc-tit">${esc(tit)}</div>
      <div class="jc-val">${brlc(p.valor_face)}</div>
      <div class="jc-meta">${esc(p.ente_devedor || "—")}${p.tribunal ? " · " + esc(p.tribunal) : ""}</div>
      ${progresso(p)}
      ${e.final ? "" : `<div class="jc-missao"><span>Próximo passo</span>${esc(e.missao || "")}</div>`}
      <div class="jc-dias">${d == null ? "" : d === 0 ? "nesta fase desde hoje" : `há ${d} dia${d > 1 ? "s" : ""} nesta fase`}</div>
    </div>
    ${e.final ? "" : `<div class="jc-acoes">${ant ? `<button class="btn sm ghost" data-voltar="${p.id}" title="Voltar para ${esc(ant.nome)}">←</button>` : ""}<span class="spacer"></span>${nx ? `<button class="btn sm primary" data-avancar="${p.id}">Avançar →</button>` : ""}</div>`}
  </article>`;
}
function vFunil() {
  const q = norm(S.jq);
  const P = S.precs.filter(p => !q || norm([titularNome(p), p.ente_devedor, p.numero_precatorio, p.processo_origem, ...(p.advogados || []).map(a => a.nome)].join(" ")).includes(q));
  const ativos = P.filter(p => !etapaDe(p.etapa).final);
  const ganhos = P.filter(p => etapaDe(p.etapa).ganho);
  const cols = S.etapas.filter(e => e.id !== "perdido");
  const grupos = [];
  for (const e of cols) { const g = grupos[grupos.length - 1]; if (g && g.ato === (e.ato || "")) g.etapas.push(e); else grupos.push({ato:e.ato || "", etapas:[e]}); }
  const perdidos = P.filter(p => p.etapa === "perdido").length;
  return `<header class="jhead"><div><h1>Jornada dos negócios</h1><p class="sub">Cada cartão é um negócio. Ele anda da descoberta ao fechamento; o próximo passo está escrito nele.</p></div>
    <div class="jresumo"><div><b>${ativos.length}</b><span>em andamento</span></div><div><b>${brlc(ativos.reduce((s, p) => s + (p.valor_face || 0), 0))}</b><span>em jogo</span></div><div><b>${ganhos.length}</b><span>fechados</span></div></div></header>
  <div class="row jtools"><input type="search" id="jq" placeholder="Buscar titular, ente, advogado, nº…" value="${esc(S.jq)}"><label class="chk"><input type="checkbox" id="jtodas" ${S.jtodas ? "checked" : ""}> Mostrar fases vazias abertas</label><span class="spacer"></span>${perdidos ? `<button class="btn sm ghost" data-go="lista">${perdidos} arquivado(s)</button>` : ""}<button class="btn sm" data-go="pesquisa">+ Buscar novo alvo</button></div>
  ${!S.precs.length ? `<div class="vazio-jornada"><h2>Tudo começa na exploração</h2><p>Escolha um precatório em <b>Explorar precatórios</b> e clique em <b>Levar para a carteira</b>. Ele aparece aqui, na primeira fase.</p><button class="btn primary" data-go="pesquisa">Explorar precatórios</button></div>` : `
  <div class="mapa">${grupos.map(g => { const a = atoDe(g.ato);
    return `<section class="ato" style="--c:${a.cor}"><div class="ato-nome">${esc(a.nome || "Outras fases")}</div><div class="ato-cols">${g.etapas.map(e => { const ps = P.filter(p => p.etapa === e.id); const fechada = !ps.length && !S.jtodas;
      return `<div class="col ${fechada ? "fechada" : ""}" data-col="${e.id}" style="--c:${esc(e.cor)}" title="${esc(e.nome)}">
        <div class="colh"><span class="col-n">${etapaIdx(e.id) + 1}</span><span class="col-t">${esc(e.nome)}</span>${ps.length ? `<span class="col-q">${ps.length}</span>` : ""}</div>
        <div class="cards">${ps.map(cardJornada).join("")}</div></div>`; }).join("")}</div></section>`; }).join("")}
  </div>`}`;
}
function bindKanban() {
  document.querySelectorAll(".jcard").forEach(c => c.addEventListener("dragstart", ev => { ev.dataTransfer.setData("text/plain", c.dataset.card); c.classList.add("arrastando"); }));
  document.querySelectorAll(".col").forEach(col => {
    col.addEventListener("dragover", ev => { ev.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", ev => { ev.preventDefault(); col.classList.remove("over"); pedirMudanca(ev.dataTransfer.getData("text/plain"), col.dataset.col); });
  });
}
async function moverEtapa(id, etapa, extra) {
  const p = S.precs.find(x => x.id === id); if (!p || p.etapa === etapa) return;
  const de = etapaDe(p.etapa).nome, agora = new Date().toISOString(), por = S.usuario ? S.usuario.email : undefined;
  if (extra) Object.assign(p, extra);
  p.etapa = etapa; p.etapa_desde = agora;
  (p.jornada = p.jornada || []).push({etapa, data:agora, por});
  (p.notas = p.notas || []).push({data:agora, texto:`Fase: ${de} → ${etapaDe(etapa).nome}`, auto:true, por});
  await salvarPrec(p); render(); toast(etapaDe(etapa).final ? (etapaDe(etapa).ganho ? "Negócio finalizado" : "Negócio arquivado") : "Agora: " + etapaDe(etapa).nome);
}
function pedirMudanca(id, etapa) {
  const p = S.precs.find(x => x.id === id), e = etapaDe(etapa); if (!p || p.etapa === etapa) return;
  const avancando = etapaIdx(etapa) > etapaIdx(p.etapa);
  if (avancando && e.pede === "advogado") {
    const a = (p.advogados || [])[0] || {};
    return modal(`<h2>${esc(e.nome)}</h2><p class="hint">Registre o contato encontrado. Dá para completar depois.</p>
      <div class="grid"><label class="f">Nome do advogado<input id="mAdvNome" value="${esc(a.nome || "")}"></label><label class="f">OAB<input id="mAdvOab" value="${esc(a.oab || "")}"></label>
      <label class="f">Telefone / WhatsApp<input id="mAdvTel" value="${esc(a.telefone || "")}"></label><label class="f">E-mail<input id="mAdvEmail" value="${esc(a.email || "")}"></label></div>
      <div class="row" style="margin-top:14px"><button class="btn primary" data-confmov="${id}|${etapa}">Avançar</button><button class="btn" data-close>Cancelar</button></div>`);
  }
  if (avancando && e.pede === "proposta") return modal(`<h2>${esc(e.nome)}</h2><label class="f">Valor que o fundo ofereceu (R$)<input id="mValor" inputmode="decimal" value="${fnumIn(p.proposta_fundo)}"></label>
      <div class="row" style="margin-top:14px"><button class="btn primary" data-confmov="${id}|${etapa}">Avançar</button><button class="btn" data-close>Cancelar</button></div>`);
  if (avancando && e.pede === "acordo") return modal(`<h2>${esc(e.nome)}</h2><label class="f">Valor aceito pelo titular (R$)<input id="mValor" inputmode="decimal" value="${fnumIn(p.valor_acordado || p.proposta_fundo)}"></label>
      <div class="row" style="margin-top:14px"><button class="btn primary" data-confmov="${id}|${etapa}">Avançar</button><button class="btn" data-close>Cancelar</button></div>`);
  return moverEtapa(id, etapa);
}
/* ---- checklist de documentos ---- */
const DOCS = {
  PF:["Documento de identidade (RG ou CNH)","CPF","Comprovante de residência","Certidão de estado civil (nascimento ou casamento)","CND federal (Receita/PGFN)","CND estadual","CND municipal","CNDT trabalhista","Certidões cíveis da Justiça Estadual","Certidões da Justiça Federal","Dados bancários"],
  PJ:["Contrato social consolidado","Última alteração contratual","Certidão simplificada da Junta Comercial","Cartão CNPJ","Documentos dos sócios administradores","Procuração (se houver)","CND federal (Receita/PGFN)","CND estadual","CND municipal","CNDT trabalhista","CRF do FGTS","Certidão de falência e recuperação judicial","Certidões cíveis","Dados bancários"],
  ESPOLIO:["Certidão de óbito","Termo de compromisso do inventariante","Alvará judicial para a cessão","Documentos do inventariante","Documentos dos herdeiros","CND federal do espólio","Certidões cíveis","Dados bancários"],
};
function checklistDocs(p) {
  const tipo = p.tipo_cedente || ((p.titulares || [])[0] && (p.titulares[0].tipo === "PF" || p.titulares[0].tipo === "ESPOLIO") ? p.titulares[0].tipo : "PJ");
  const itens = [...DOCS[tipo === "ESPOLIO" ? "ESPOLIO" : tipo === "PF" ? "PF" : "PJ"], ...(p.docs_extras || [])], ck = p.checklist || {};
  const ok = itens.filter(i => ck[i]).length;
  return `<div class="panel checklist"><div class="row"><h3 style="margin:0">Documentos para o fundo</h3><span class="spacer"></span>
    <select id="tipoCed"><option value="PJ" ${tipo === "PJ" || tipo === "SOC_ADV" ? "selected" : ""}>Titular pessoa jurídica</option><option value="PF" ${tipo === "PF" ? "selected" : ""}>Titular pessoa física</option><option value="ESPOLIO" ${tipo === "ESPOLIO" ? "selected" : ""}>Espólio</option></select></div>
    <div class="bar" style="margin:10px 0 12px"><span style="width:${itens.length ? ok / itens.length * 100 : 0}%"></span></div><p class="hint" style="margin-top:-6px">${ok} de ${itens.length} reunidos</p>
    <ul class="ck">${itens.map(i => `<li><label><input type="checkbox" data-ck="${esc(i)}" ${ck[i] ? "checked" : ""}> ${esc(i)}</label></li>`).join("")}</ul>
    <div class="row" style="margin-top:8px"><input id="novoDoc" placeholder="Outro documento pedido pelo fundo"><button class="btn sm" id="addDoc">Adicionar</button></div></div>`;
}
/* ---- aba Jornada da ficha ---- */
function fJornada(p, a) {
  const L = etapasJornada(), i = L.findIndex(e => e.id === p.etapa), e = etapaDe(p.etapa), nx = proximaEtapa(p), ant = etapaAnterior(p);
  const hist = {}; for (const h of (p.jornada || [])) hist[h.etapa] = h;
  const adv = (p.advogados || [])[0];
  const docsAtivo = etapaIdx(p.etapa) >= etapaIdx("docs_pedidos") && !e.final || (p.checklist && Object.keys(p.checklist).length);
  return `<div class="jficha">
    <div class="panel jatual" style="--c:${esc(e.cor)}">
      <div class="ja-fase">${e.final ? "" : `Fase ${i + 1} de ${L.length} · ${esc(atoDe(e.ato).nome)}`}</div>
      <h2>${esc(e.nome)}</h2>
      ${e.final ? `<p>${esc(e.missao)}</p>` : `<p class="ja-missao"><span>Próximo passo</span>${esc(e.missao)}</p>`}
      ${progresso(p)}
      ${e.final ? `<div class="row" style="margin-top:14px"><button class="btn" data-reabrir="${p.id}">Reabrir negócio</button></div>` : `<div class="row" style="margin-top:14px">${nx ? `<button class="btn primary" data-avancar="${p.id}">Avançar para: ${esc(nx.nome)} →</button>` : ""}${ant ? `<button class="btn ghost" data-voltar="${p.id}">← Voltar</button>` : ""}<span class="spacer"></span><button class="btn ghost danger" data-arquivar="${p.id}">Arquivar</button></div>`}
    </div>
    <div class="two">
      <div class="panel"><h3>O caminho</h3><ol class="linha">${L.map((x, k) => { const h = hist[x.id];
        return `<li class="${k < i ? "feito" : k === i ? "atual" : ""}" style="--c:${esc(x.cor)}"><span class="pt"></span><div><b>${esc(x.nome)}</b>${h ? `<small>${new Date(h.data).toLocaleDateString("pt-BR")}${h.por ? " · " + esc(h.por.split("@")[0]) : ""}</small>` : ""}</div></li>`; }).join("")}</ol></div>
      <div class="grid" style="align-content:start">
        <div class="panel"><h3>Contato do advogado</h3>${adv ? `<p style="margin:0"><b>${esc(adv.nome)}</b>${adv.oab ? ` · OAB ${esc(adv.oab)}` : ""}</p><p class="hint" style="margin:4px 0 0">${esc([adv.telefone, adv.email].filter(Boolean).join(" · ") || "sem telefone ou e-mail")}</p>` : `<p class="hint" style="margin:0">Ainda não encontrado.${p.processo_origem ? ` Comece pelo processo de origem <b>${esc(p.processo_origem)}</b>${p.juizo_origem ? ` (${esc(p.juizo_origem)})` : ""}.` : ""}</p>`}
          <div class="row" style="margin-top:10px"><button class="btn sm" data-tab="partes">Ver partes e advogados</button></div></div>
        <div class="panel"><h3>Valores do negócio</h3><div class="dl">${kv("Valor de face", brl(p.valor_face))}${kv("Proposta do fundo", brl(p.proposta_fundo))}${kv("Valor aceito pelo titular", brl(p.valor_acordado))}${kv("Nossa comissão", brl(a.comissao))}</div>
          <div class="row" style="margin-top:10px"><button class="btn sm" data-tab="negociacao">Editar negociação</button></div></div>
        ${docsAtivo ? checklistDocs(p) : ""}
      </div>
    </div></div>`;
}
/* ---- migração das etapas antigas ---- */
S._mig = {precs:false, etapas:false, feito:false};
async function migrarEtapas() {
  if (S._mig.feito || !S._mig.precs || !S._mig.etapas || !S.db) return;
  S._mig.feito = true;
  const ids = new Set(S.etapas.map(e => e.id));
  if (ids.has("mapeado") || ids.has("dd") || ids.has("cessao") || !ids.has("contato_adv")) {
    const extras = S.etapas.filter(e => !MIGRA_ETAPAS[e.id] && !ETAPAS_BASE.some(b => b.id === e.id));
    S.etapas = [...ETAPAS_BASE.filter(b => !b.final), ...extras.map(e => ({...e, ato:e.ato || "fechamento", cor:e.cor || atoDe("fechamento").cor})), ...ETAPAS_BASE.filter(b => b.final)];
    await salvarEtapas();
  }
  const validos = new Set(S.etapas.map(e => e.id));
  for (const p of S.precs) if (!validos.has(p.etapa)) { p.etapa = MIGRA_ETAPAS[p.etapa] && validos.has(MIGRA_ETAPAS[p.etapa]) ? MIGRA_ETAPAS[p.etapa] : "alvo"; p.etapa_desde = p.etapa_desde || p.atualizado; await salvarPrec(p); }
  render();
}
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button"); if (!t) return; const d = t.dataset;
  if (d.avancar) { ev.stopPropagation(); const p = S.precs.find(x => x.id === d.avancar), nx = p && proximaEtapa(p); if (nx) pedirMudanca(p.id, nx.id); return; }
  if (d.voltar) { ev.stopPropagation(); const p = S.precs.find(x => x.id === d.voltar), an = p && etapaAnterior(p); if (an) moverEtapa(p.id, an.id); return; }
  if (d.arquivar) return modal(`<h2>Arquivar este negócio?</h2><p>Ele sai da jornada e fica guardado na carteira. Dá para reabrir depois.</p><label class="f">Motivo (opcional)<input id="mMotivo" placeholder="Ex.: titular não quis vender"></label><div class="row" style="margin-top:14px"><button class="btn danger" data-confarq="${d.arquivar}">Arquivar</button><button class="btn" data-close>Cancelar</button></div>`);
  if (d.confarq) { const motivo = ($("#mMotivo") || {}).value || ""; fechaModal(); return moverEtapa(d.confarq, "perdido", motivo ? {motivo_arquivo:motivo} : null); }
  if (d.reabrir) { const p = S.precs.find(x => x.id === d.reabrir); const ult = (p.jornada || []).filter(h => !etapaDe(h.etapa).final).pop(); return moverEtapa(p.id, ult ? ult.etapa : S.etapas[0].id); }
  if (d.confmov) { const [id, etapa] = d.confmov.split("|"), p = S.precs.find(x => x.id === id), e = etapaDe(etapa), extra = {};
    if (e.pede === "advogado") { const nome = $("#mAdvNome").value.trim(); if (nome) { const adv = {nome, oab:$("#mAdvOab").value.trim(), telefone:$("#mAdvTel").value.trim(), email:$("#mAdvEmail").value.trim(), papel:"Advogado do titular"}; const L = [...(p.advogados || [])]; if (L[0] && L[0].nome === nome) L[0] = {...L[0], ...adv}; else L.unshift(adv); extra.advogados = L; } }
    if (e.pede === "proposta") { const v = parseNum($("#mValor").value); if (v) extra.proposta_fundo = v; }
    if (e.pede === "acordo") { const v = parseNum($("#mValor").value); if (v) extra.valor_acordado = v; }
    fechaModal(); return moverEtapa(id, etapa, extra); }
  if (t.id === "addDoc") { const v = $("#novoDoc").value.trim(); if (!v) return; const p = S.precs.find(x => x.id === S.id); p.docs_extras = [...(p.docs_extras || []), v]; await salvarPrec(p); return render(); }
}, true);
document.addEventListener("change", async ev => {
  const el = ev.target;
  if (el.id === "jtodas") { S.jtodas = el.checked; return render(); }
  if (el.dataset.ck != null) { const p = S.precs.find(x => x.id === S.id); p.checklist = {...(p.checklist || {}), [el.dataset.ck]:el.checked}; if (!el.checked) delete p.checklist[el.dataset.ck]; await salvarPrec(p); return render(); }
  if (el.id === "tipoCed") { const p = S.precs.find(x => x.id === S.id); p.tipo_cedente = el.value; await salvarPrec(p); return render(); }
});
document.addEventListener("input", ev => { if (ev.target.id === "jq") { S.jq = ev.target.value; clearTimeout(S._jq); S._jq = setTimeout(() => { const pos = ev.target.selectionStart; render(); const n = $("#jq"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250); } });

/* ============ inicialização ============ */
function iniciarDados(db) {
  db.collection("precatorios").onSnapshot(snap => { S.precs = snap.docs.map(d => ({id:d.id, ...d.data()})); S._mig.precs = true; migrarEtapas(); if (S.view !== "novo" && S.view !== "editar") render(); else renderNav(); },
    e => { toast("Conexão com os dados perdida"); });
  db.doc("config/etapas").onSnapshot(s => { if (s.exists && Array.isArray(s.data().lista) && s.data().lista.length) { S.etapas = s.data().lista.map(e => ({...e})); S.etapasSalvas = true; } S._mig.etapas = true; migrarEtapas();
    if (!["novo","editar","config"].includes(S.view)) render(); });
  db.doc("config/pesquisas").onSnapshot(s => { S.pesqSalvas = s.exists && Array.isArray(s.data().lista) ? s.data().lista.map(x => ({nome:x.nome, filtros:{...x.filtros}})) : []; if (S.view === "pesquisa") render(); });
  db.collection("listagens").onSnapshot(s => { const antes = S.lmeta.map(m => m.id + m.qtd).join(); S.lmeta = s.docs.map(d => ({...d.data(), id:d.id})); if (S.lmeta.map(m => m.id + m.qtd).join() !== antes) { S.lcarreg = false; carregarListagens(); } if (S.view === "pesquisa") render(); });
  db.doc("indices/serie").onSnapshot(s => { if (s.exists) { const d = s.data(); S.selic = {...(d.selic || {})}; S.ipca = {...(d.ipca || {})}; S.idxMeta = {fonte:d.fonte, coleta:d.coleta}; }
    if (!["novo","editar"].includes(S.view)) render(); });
}

