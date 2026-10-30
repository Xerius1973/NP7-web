const http=require('http'),fs=require('fs'),path=require('path');
const port=process.env.PORT||10000,root=__dirname;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
// Seuls ces éléments sont publiés (le reste du dépôt reste privé : server.js, supabase/, etc.)
const allowed=/^\/(index\.html|np7\.css|np7-ui\.js|sw\.js|manifest\.webmanifest|icons\/[\w.-]+|public\/data\/[\w.-]+\.json)?$/;
http.createServer((req,res)=>{
  let u=decodeURIComponent(new URL(req.url,'http://x').pathname);
  if(u==='/')u='/index.html';
  if(!allowed.test(u)){res.writeHead(404);return res.end('NP7: fichier introuvable')}
  fs.readFile(path.join(root,path.normalize(u)),(e,d)=>{
    if(e){res.writeHead(404);return res.end('NP7: fichier introuvable')}
    res.writeHead(200,{'Content-Type':mime[path.extname(u)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(d);
  });
}).listen(port,'0.0.0.0',()=>console.log('NP7 sur 0.0.0.0:'+port));
