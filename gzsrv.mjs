import http from 'http'; import fs from 'fs'; import path from 'path'; import zlib from 'zlib';
const ROOT=process.argv[2]; const PORT=+process.argv[3];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  let f=path.join(ROOT,p);
  try{ if(fs.statSync(f).isDirectory()) f=path.join(f,'index.html'); }catch(e){ if(!fs.existsSync(f)){res.writeHead(404);return res.end();} }
  if(!fs.existsSync(f)){res.writeHead(404);return res.end('404');}
  const ext=path.extname(f)||'.html';
  const body=fs.readFileSync(f);
  const ae=req.headers['accept-encoding']||'';
  const compressible=/text|javascript|xml|svg/.test(mime[ext]||'');
  let out=body, enc=null;
  if(compressible && ae.includes('br')){ out=zlib.brotliCompressSync(body,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}); enc='br'; }
  else if(compressible && ae.includes('gzip')){ out=zlib.gzipSync(body,{level:6}); enc='gzip'; }
  const h={'Content-Type':mime[ext]||'application/octet-stream','Content-Length':out.length};
  if(enc)h['Content-Encoding']=enc;
  h['Cache-Control']= p.startsWith('/_next/static') ? 'public, max-age=0, must-revalidate' : 'public, max-age=0, must-revalidate';
  res.writeHead(200,h); res.end(out);
}).listen(PORT,()=>console.log('up on',PORT));
