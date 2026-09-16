// ---------------------------------------------------------------------------
// Função de servidor do painel (roda na Vercel, não no navegador).
//
// GET  /api/dados  -> devolve o fechamento publicado de todos os dias.
// POST /api/dados  -> publica um dia (exige a senha de publicação).
//
// Os dados ficam guardados no arquivo dados.json do próprio repositório, então
// cada publicação vira um commit — dá para ver o histórico pelo GitHub.
//
// Precisa de duas variáveis de ambiente configuradas na Vercel:
//   GITHUB_TOKEN      token do GitHub com permissão de escrita neste repositório
//   PUBLISH_PASSWORD  a senha que quem for publicar digita no painel
// Opcionais: GITHUB_REPO ("dono/repositorio") e GITHUB_BRANCH (padrão "main").
//
// O token NUNCA chega ao navegador: ele só existe aqui dentro, no servidor.
// ---------------------------------------------------------------------------

const REPO    = process.env.GITHUB_REPO   || 'financeirogr01-hash/Sal---Fechamento-Diario-Financeiro';
const BRANCH  = process.env.GITHUB_BRANCH || 'main';
const ARQUIVO = 'dados.json';
const API     = `https://api.github.com/repos/${REPO}/contents/${ARQUIVO}`;

function github(url, options){
  const opts = options || {};
  return fetch(url, Object.assign({}, opts, {
    headers: Object.assign({
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'painel-fechamento-diario',
      'Content-Type': 'application/json'
    }, opts.headers || {})
  }));
}

// Lê o dados.json que está publicado agora. Devolve também o sha, que o GitHub
// exige para regravar o arquivo (é o que impede duas publicações simultâneas de
// uma sobrescrever a outra sem ninguém perceber).
async function lerPublicado(){
  const r = await github(`${API}?ref=${encodeURIComponent(BRANCH)}`);
  if(r.status === 404) return { dados: {}, sha: null };
  if(!r.ok){
    const txt = await r.text();
    throw new Error(`GitHub respondeu ${r.status} ao ler ${ARQUIVO}: ${txt.slice(0,200)}`);
  }
  const j = await r.json();
  let dados = {};
  try{
    dados = JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8') || '{}');
  }catch(e){
    throw new Error(`O ${ARQUIVO} publicado está corrompido: ${e.message}`);
  }
  return { dados: (dados && typeof dados === 'object') ? dados : {}, sha: j.sha || null };
}

module.exports = async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if(!process.env.GITHUB_TOKEN){
    return res.status(500).json({ erro: 'Falta configurar GITHUB_TOKEN nas variáveis de ambiente da Vercel.' });
  }

  try{
    if(req.method === 'GET'){
      const { dados } = await lerPublicado();
      return res.status(200).json({ ok: true, dados });
    }

    if(req.method === 'POST'){
      if(!process.env.PUBLISH_PASSWORD){
        return res.status(500).json({ erro: 'Falta configurar PUBLISH_PASSWORD nas variáveis de ambiente da Vercel.' });
      }
      let body = req.body;
      if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
      body = body || {};

      if(String(body.senha || '') !== String(process.env.PUBLISH_PASSWORD)){
        return res.status(401).json({ erro: 'Senha de publicação incorreta.' });
      }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(body.data || ''))){
        return res.status(400).json({ erro: 'Data inválida — esperado AAAA-MM-DD.' });
      }
      if(!body.dataset || typeof body.dataset !== 'object' || Array.isArray(body.dataset)){
        return res.status(400).json({ erro: 'Nenhum dado de fechamento recebido.' });
      }

      const autor = String(body.autor || '').trim().slice(0, 60);

      // Até 3 tentativas: se alguém publicar entre a nossa leitura e a nossa
      // gravação, o sha muda, o GitHub recusa com 409 e a gente relê e refaz —
      // assim a publicação do outro não é perdida.
      for(let tentativa = 1; tentativa <= 3; tentativa++){
        const { dados, sha } = await lerPublicado();
        dados[body.data] = body.dataset;
        if(!dados._meta || typeof dados._meta !== 'object') dados._meta = {};
        dados._meta[body.data] = { publicadoEm: new Date().toISOString(), autor: autor };

        const put = await github(API, {
          method: 'PUT',
          body: JSON.stringify(Object.assign({
            message: `Publicar fechamento de ${body.data}${autor ? ` — ${autor}` : ''}`,
            content: Buffer.from(JSON.stringify(dados, null, 2), 'utf8').toString('base64'),
            branch: BRANCH
          }, sha ? { sha } : {}))
        });

        if(put.ok){
          const j = await put.json();
          return res.status(200).json({
            ok: true,
            commit: (j.commit && j.commit.sha) ? j.commit.sha.slice(0, 7) : null,
            meta: dados._meta[body.data]
          });
        }
        if(put.status !== 409){
          const txt = await put.text();
          return res.status(502).json({ erro: `O GitHub recusou a gravação (${put.status}): ${txt.slice(0,300)}` });
        }
      }
      return res.status(409).json({ erro: 'Outra pessoa publicou ao mesmo tempo. Tente publicar de novo.' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erro: 'Método não suportado.' });

  }catch(e){
    return res.status(500).json({ erro: String((e && e.message) || e) });
  }
};
