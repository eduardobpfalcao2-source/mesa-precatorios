/* ============ conexão com o banco (Supabase) ============ */
function criarDb(sb, userId) {
  const subs = new Set(); const pend = {};
  const erro = e => ({code:"unavailable", message:e && e.message || String(e)});
  const snapDoc = (id, data) => ({id, exists:data != null, data:() => data == null ? undefined : data, metadata:{fromCache:false, hasPendingWrites:false}});
  async function lerDoc(c, id) { const {data, error} = await sb.from("docs").select("id,data").eq("collection", c).eq("id", id).maybeSingle(); if (error) throw erro(error); return snapDoc(id, data ? data.data : null); }
  async function lerCol(c) {
    const docs = []; let de = 0; const passo = c === "listagem_itens" ? 5 : 500;
    for (;;) { const {data, error} = await sb.from("docs").select("id,data").eq("collection", c).order("id").range(de, de + passo - 1); if (error) throw erro(error);
      docs.push(...data.map(r => snapDoc(r.id, r.data))); if (data.length < passo) break; de += passo; }
    return {docs, size:docs.length, empty:!docs.length, docChanges:() => [], metadata:{fromCache:false, hasPendingWrites:false}};
  }
  function avisar(c) { clearTimeout(pend[c]); pend[c] = setTimeout(() => { for (const s of subs) if (s.c === c) s.run(); }, 250); }
  function refDoc(c, id) { return {id, path:c + "/" + id, get:() => lerDoc(c, id),
    set:async d => { const {error} = await sb.from("docs").upsert({collection:c, id, data:d, updated_at:new Date().toISOString()}); if (error) throw erro(error); avisar(c); },
    update:async d => { const s = await lerDoc(c, id); if (!s.exists) throw {code:"invalid_argument", message:"documento não existe"}; return refDoc(c, id).set({...s.data(), ...d}); },
    delete:async () => { const {error} = await sb.from("docs").delete().eq("collection", c).eq("id", id); if (error) throw erro(error); avisar(c); },
    onSnapshot(next, err) { const s = {c, run:() => lerDoc(c, id).then(next, e => err && err(e))}; subs.add(s); s.run(); return () => subs.delete(s); } }; }
  function refCol(c) { return {path:c, doc:id => refDoc(c, id || uid()), limit:() => refCol(c), orderBy:() => refCol(c), where:() => refCol(c), get:() => lerCol(c),
    add:async d => { const r = refDoc(c, uid()); await r.set(d); return r; },
    onSnapshot(next, err) { const s = {c, run:() => lerCol(c).then(next, e => err && err(e))}; subs.add(s); s.run(); return () => subs.delete(s); } }; }
  window.addEventListener("focus", () => { for (const s of subs) if (s.c !== "listagem_itens") s.run(); });
  return {doc:p => { const [c, id] = p.split("/"); return refDoc(c, id); }, collection:c => refCol(c)};
}
const baixarArquivo = {save:async ({filename, data}) => { const url = URL.createObjectURL(new Blob([data])); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); return {status:"saved"}; }};

/* ============ entrada ============ */
function telaLogin(msg) {
  $("#nav").innerHTML = `<div class="brand">Mesa de Precatórios<small>Mapeamento e negociação</small></div>`;
  $("#main").innerHTML = `<div class="panel" style="max-width:380px;margin:40px auto">
    <h1 style="font-size:22px">Entrar</h1><p class="sub">Acesso restrito aos sócios.</p>
    <form id="login" class="grid">
      <label class="f">E-mail<input id="lgEmail" type="email" autocomplete="username" required></label>
      <label class="f">Senha<input id="lgSenha" type="password" autocomplete="current-password" required minlength="8"></label>
      <button class="btn primary" type="submit">Entrar</button>
      <button class="btn" type="button" id="lgCriar">Primeiro acesso: criar senha</button>
      <button class="btn sm" type="button" id="lgEsqueci" style="border:0">Esqueci a senha</button>
      ${msg ? `<div class="alert media"><div>${esc(msg)}</div></div>` : ""}
    </form></div>`;
}
async function entrar(sb) {
  const {data} = await sb.auth.getSession();
  if (!data.session) { telaLogin(); return; }
  S.usuario = data.session.user;
  S.db = criarDb(sb, S.usuario.id); S.dl = baixarArquivo; S.modo = "db";
  iniciarDados(S.db); render();
  semearBasePublica(sb).catch(e => toast("Falha ao carregar a base pública: " + (e.message || e)));
}
async function semearBasePublica(sb, forcar) {
  let man; try { man = await (await fetch("dados/manifesto.json", {cache:"no-store"})).json(); } catch (e) { return; }
  const ids = async c => { const out = []; for (let de = 0; ; de += 1000) { const {data, error} = await sb.from("docs").select("id").eq("collection", c).range(de, de + 999); if (error) throw error; out.push(...data.map(r => r.id)); if (data.length < 1000) break; } return new Set(out); };
  let temL, temI; try { temL = await ids("listagens"); temI = await ids("listagem_itens"); } catch (e) { console.error("[base] leitura", e); return; }
  const semIndices = !(await sb.from("docs").select("id").eq("collection", "indices").eq("id", "serie").maybeSingle()).data;
  const faltaL = man.listagens.filter(id => forcar || !temL.has(id));
  const faltaI = (man.itens || []).filter(id => forcar || !temI.has(id));
  if (!faltaL.length && !faltaI.length && !semIndices) return;
  toast("Carregando listagens dos tribunais…");
  const b = await (await fetch("dados/base_publica.json", {cache:"no-store"})).json();
  const agora = () => new Date().toISOString(); let erros = 0;
  const up = async (c, d) => { for (let k = 0; k < 3; k++) { const {error} = await sb.from("docs").upsert({collection:c, id:d.id, data:d.data, updated_at:agora()}); if (!error) return true; console.error("[base]", c, d.id, error); await new Promise(r => setTimeout(r, 1500)); } erros++; return false; };
  if (semIndices) for (const d of (b.docs.indices || [])) await up("indices", d);
  const listas = new Set([...faltaL, ...(b.docs.listagem_itens || []).filter(d => faltaI.includes(d.id)).map(d => d.data.listagem)]);
  for (const d of (b.docs.listagem_itens || [])) if (listas.has(d.data.listagem) && (forcar || !temI.has(d.id) || faltaL.includes(d.data.listagem))) await up("listagem_itens", d);
  for (const d of (b.docs.listagens || [])) if (listas.has(d.id)) await up("listagens", {id:d.id, data:{...d.data, chunks:(b.docs.listagem_itens || []).filter(x => x.data.listagem === d.id).length}});
  const q = await S.db.collection("listagens").get(); S.lmeta = q.docs.map(d => ({...d.data(), id:d.id}));
  const ix = await S.db.doc("indices/serie").get(); if (ix.exists) { const d = ix.data(); S.selic = {...d.selic}; S.ipca = {...d.ipca}; S.idxMeta = {fonte:d.fonte, coleta:d.coleta}; }
  S.lcarreg = false; await carregarListagens(); toast(erros ? `Listagens carregadas com ${erros} falha(s). Tente "Recarregar listagens públicas" em Etapas e ajustes.` : "Listagens carregadas"); render();
}
window.recarregarBase = () => semearBasePublica(window._sb, true).catch(e => toast("Falha: " + (e.message || e)));

function iniciarWeb() {
  if (!window.supabase || !SUPA_URL || SUPA_URL.includes("__")) { $("#main").innerHTML = `<div class="panel empty">App ainda não configurado: falta o endereço do banco de dados.</div>`; return; }
  const sb = supabase.createClient(SUPA_URL, SUPA_KEY); window._sb = sb;
  document.addEventListener("submit", async ev => { if (ev.target.id !== "login") return; ev.preventDefault();
    const {error} = await sb.auth.signInWithPassword({email:$("#lgEmail").value.trim(), password:$("#lgSenha").value});
    if (error) return telaLogin(error.message.includes("Invalid") ? "E-mail ou senha incorretos." : error.message.includes("confirm") ? "Confirme o e-mail pelo link que você recebeu e tente de novo." : error.message);
    entrar(sb); });
  document.addEventListener("click", async ev => {
    if (ev.target.id === "lgCriar") { const email = $("#lgEmail").value.trim(), senha = $("#lgSenha").value; if (!email || senha.length < 8) return telaLogin("Preencha o e-mail e uma senha de pelo menos 8 caracteres.");
      const {error} = await sb.auth.signUp({email, password:senha, options:{emailRedirectTo:location.origin + location.pathname}});
      telaLogin(error ? (error.message.includes("autorizado") || error.message.includes("Database") ? "Este e-mail não está autorizado." : error.message) : "Conta criada. Se chegar um e-mail de confirmação, clique no link e depois entre aqui."); }
    if (ev.target.id === "lgEsqueci") { const email = $("#lgEmail").value.trim(); if (!email) return telaLogin("Preencha o e-mail.");
      await sb.auth.resetPasswordForEmail(email, {redirectTo:location.origin + location.pathname}); telaLogin("Se o e-mail estiver cadastrado, chegará um link para trocar a senha."); }
    if (ev.target.id === "sair") { await sb.auth.signOut(); location.reload(); }
  });
  sb.auth.onAuthStateChange(async (evt) => { if (evt === "PASSWORD_RECOVERY") { const nova = window.prompt ? null : null;
    $("#main").innerHTML = `<div class="panel" style="max-width:380px;margin:40px auto"><h1 style="font-size:22px">Nova senha</h1><form id="novaSenha" class="grid"><label class="f">Nova senha<input id="nsSenha" type="password" minlength="8" required></label><button class="btn primary">Salvar senha</button></form></div>`; } });
  document.addEventListener("submit", async ev => { if (ev.target.id !== "novaSenha") return; ev.preventDefault(); const {error} = await sb.auth.updateUser({password:$("#nsSenha").value}); if (error) return toast(error.message); toast("Senha alterada"); entrar(sb); });
  entrar(sb);
}

iniciarWeb();
