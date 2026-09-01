import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_PORT = 2020;

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/script.js', ['script.js', 'text/javascript; charset=utf-8']],
]);

export function createAppServer() {
  return createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const staticFile = staticFiles.get(pathname);

    if (!staticFile) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not Found');
      return;
    }

    const [fileName, contentType] = staticFile;
    response.writeHead(200, { 'content-type': contentType });
    createReadStream(join(projectRoot, fileName)).pipe(response);
  });
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const server = createAppServer();
  server.listen(port, 'localhost', () => {
    console.log(`오목 서버가 http://localhost:${port} 에서 실행 중입니다.`);
  });
}
