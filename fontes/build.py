css=open('style.css',encoding='utf8').read(); app=open('app.js',encoding='utf8').read(); ad=open('adapter.js',encoding='utf8').read()
html=f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Mesa de Precatórios</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Manrope:wght@400;500;600;700;800&display=swap">
<style>{css}</style>
<style>body{{margin:0}}[hidden]{{display:none!important}}</style>
</head><body>
<div class="app"><nav class="side" id="nav"></nav><main id="main"><div class="empty">Carregando…</div></main></div><div id="overlay"></div>
<script src="supabase.js"></script>
<script src="config.js"></script>
<script>
{app}{ad}</script></body></html>'''
open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','index.html'),'w',encoding='utf8').write(html); print(len(html))
