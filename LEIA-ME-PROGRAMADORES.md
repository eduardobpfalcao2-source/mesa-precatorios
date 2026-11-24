# Mesa de Precatórios — guia para quem programa o app

Este arquivo é para o Claude (ou qualquer programador) que for mexer no app. Leia inteiro antes de começar.

## Para quem é
- Negócio próprio de Eduardo, Gabriel e Pedro: intermediação de compra de precatórios por fundos de investimento. **Não é da HRA Brasil**: nada com marca HRA.
- Eduardo e Gabriel não são programadores. Explique sem jargão, um passo por vez, com o nome exato do botão. Peça print quando houver várias telas. Na dúvida sobre o que eles querem, pergunte antes de construir.
- Buscar sempre a melhor solução diante do contexto: o que funciona nas mãos deles, com poucos passos, custo baixo e seguro.

## Onde está cada coisa
- Site: https://eduardobpfalcao2-source.github.io/mesa-precatorios/ (GitHub Pages, branch `main`, raiz).
- Banco e login: Supabase, projeto "Precatórios Falcão" (organização "Falcão precatórios 2"), região São Paulo.
  - Tabela `docs` (collection, id, data jsonb): todos os dados do app.
  - Tabela `membros` (email): quem pode entrar. Liberar sócio novo: 1) Table Editor → membros → Insert row; 2) Authentication → Users → Add user (Auto Confirm). Nessa ordem.
  - A chave em `config.js` é a pública (anon). Nunca colocar a chave secreta (service_role / sb_secret) no código.
- Repositório é PÚBLICO: só código e listagens públicas dos tribunais. Nunca dados da carteira, nomes de titulares ou CPF.

## Arquivos
- `index.html` — o app publicado (gerado; não editar à mão).
- `fontes/style.css` — visual.
- `fontes/app.js` — telas e regras (jornada, pesquisa, carteira, cálculos).
- `fontes/adapter.js` — ligação com o Supabase (login e gravação).
- `fontes/build.py` — junta os três num `index.html`: `python3 fontes/build.py`.
- `supabase.js` — biblioteca do Supabase (não mexer). `config.js` — endereço e chave pública do banco.
- `dados/base_publica.json` + `dados/manifesto.json` (o manifesto lista também os pedaços, "itens", para o app recarregar o que faltar) — listagens públicas (TRF3 propostas 2025–2027, TRF5 2027) e índices; carregadas no banco no primeiro acesso de cada listagem nova.
- `supabase.sql` — estrutura do banco (já aplicada; só para referência ou recriação).

## Como publicar uma mudança
O Claude não consegue enviar ao GitHub sozinho (o envio é bloqueado). Fluxo:
1. Baixar a versão mais nova do repositório (Code → Download ZIP) antes de mexer — Eduardo e Gabriel podem ter alterado.
2. Editar em `fontes/`, rodar `python3 fontes/build.py`, testar.
3. Entregar o `index.html` novo (e os arquivos de `fontes/` alterados) para a pessoa enviar pelo site do GitHub: repositório → **Add file → Upload files** → arrastar → **Commit changes**.
4. Esperar 1 minuto e abrir o site com Ctrl + F5.
Duas pessoas não devem mexer no mesmo arquivo ao mesmo tempo: combinar antes quem está mexendo.

## O app hoje
- **Jornada dos negócios** (tela inicial): cada negócio é um cartão que anda por 16 fases em 6 atos — Descoberta (Alvo escolhido; Contato do advogado encontrado) · Abordagem (Advogado contatado; Sinal positivo do advogado) · Fundo (Enviado ao fundo; Proposta do fundo recebida) · Negociação (Proposta enviada ao titular; Em negociação; Aceite do titular; Aceite enviado ao fundo) · Documentos (Fundo pediu documentos; Documentos enviados ao fundo) · Fechamento (Contrato do fundo recebido; Contrato com os advogados; Contrato assinado; Negócio finalizado) + Arquivado. É o NEGÓCIO que evolui, não o sócio. Interface elegante, cartões, sem visual de jogo.
- "Enviar ao fundo" = enviar pelo sócio que é o canal com os fundos (ele não usa o app).
- Ficha do negócio com aba Jornada (linha do tempo, contato do advogado, valores, checklist de documentos PF/PJ/espólio — só checklist, arquivos ficam fora do app).
- **Explorar precatórios** (base de precatórios): listagens públicas (TRF3, TRF5) + planilhas importadas pelos sócios. Filtros por valor, listagem, tribunal, ente, UF, natureza, superpreferência, "só com processo de origem", "só com advogado"; "Levar para a carteira".
- **Importar planilha** (CSV com ;): por padrão manda para a BASE, não para a carteira. Cria uma lista por tribunal + ente devedor (id imp-<tribunal>-<ente>); importar de novo a mesma lista substitui a anterior. Colunas extras (advogados, observações/alertas, grau de certeza da origem) vão no 11º campo de cada linha da listagem. Opção "Direto na carteira" continua disponível.
- Listagens importadas contêm nomes de advogados: ficam só no banco, nunca no GitHub.
- Motor de correção (SELIC soma simples até 07/2025; IPCA + 2% a.a. limitado à SELIC depois — EC 136/2025, a confirmar contra cálculo homologado).

## Fontes de dados — o que já se sabe
- Res. CNJ 303/2019, art. 12, §3º: listas públicas não identificam o credor. Titular e advogado só pelo processo.
- TRF5 (rpvprecatorio.trf5.jus.br/mapa → Dívida Consolidada → Federais) publica processo de origem e vara: melhor fonte federal.
- TRF3: só número do precatório. TRF1: não publica lista.
- TJCE: painel Power BI da ordem cronológica está vazio (data de atualização em branco); pedir a lista à Assessoria de Precatórios (LAI). Acesso direto à base por trás do painel foi bloqueado pela segurança do Claude: não tentar contornar.
- DJEN (comunica.pje.jus.br, diário oficial do CNJ): consulta pública por tribunal e texto traz processo, vara e advogado com OAB. Usar a tela pública; guardar só processo, vara, advogado/OAB, devedor e valor (sem nome de titular).

## Regras inegociáveis
- Só dados públicos. Se algo não for público ou exigir burlar bloqueio, captcha ou login, parar e falar com Eduardo.
- Conferir a soma das linhas importadas contra o total da fonte.
- Nada de marca HRA.
