import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { tratarRequisicao } from './src/router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

const tiposMime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

function servirArquivoEstatico(req, res) {
  let caminho = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (caminho === '/') caminho = '/index.html';
  const arquivo = path.join(publicDir, caminho);

  if (!arquivo.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end('Acesso negado.');
  }

  fs.readFile(arquivo, (err, conteudo) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado.');
    }
    const ext = path.extname(arquivo);
    res.writeHead(200, { 'Content-Type': tiposMime[ext] || 'application/octet-stream' });
    res.end(conteudo);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/')) {
    return servirArquivoEstatico(req, res);
  }
  await tratarRequisicao(req, res);
});

function enderecosLocais() {
  const ifaces = networkInterfaces();
  const enderecos = [];
  for (const nome of Object.keys(ifaces)) {
    for (const iface of ifaces[nome]) {
      if (iface.family === 'IPv4' && !iface.internal) enderecos.push(iface.address);
    }
  }
  return enderecos;
}

servidor.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  Clínica Odontológica Jacupiranga rodando!');
  console.log('');
  console.log(`  Neste computador:  http://localhost:${PORT}`);
  for (const ip of enderecosLocais()) {
    console.log(`  No celular (mesma rede Wi-Fi):  http://${ip}:${PORT}`);
  }
  console.log('');
  console.log('  Pressione Ctrl+C para parar o servidor.');
  console.log('');
});
