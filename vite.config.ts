import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type {IncomingMessage, ServerResponse} from 'node:http';
import type {Plugin} from 'vite';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const rootPath=(relative:string)=>fileURLToPath(new URL(relative,import.meta.url));
const UPLOAD_DIR = rootPath('./Upload');

/** Dev-only: POST /api/upload?name=file.ext  body=raw bytes → SeeTogether/Upload */
function localUploadPlugin(): Plugin {
  return {
    name: 'seetogether-local-upload',
    configureServer(server) {
      fs.mkdirSync(UPLOAD_DIR, {recursive: true});
      server.middlewares.use('/api/upload', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          next();
          return;
        }
        const url = new URL(req.url || '', 'http://localhost');
        const rawName = url.searchParams.get('name') || 'upload.bin';
        const safeBase = path.basename(rawName).replace(/[\\/\x00]/g, '_') || 'upload.bin';
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          try {
            await fsp.mkdir(UPLOAD_DIR, {recursive: true});
            let dest = path.join(UPLOAD_DIR, safeBase);
            if (fs.existsSync(dest)) {
              const ext = path.extname(safeBase);
              const stem = path.basename(safeBase, ext);
              dest = path.join(UPLOAD_DIR, `${stem}-${Date.now().toString(36).slice(-5)}${ext}`);
            }
            await fsp.writeFile(dest, Buffer.concat(chunks));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ok: true, path: path.basename(dest), dir: 'Upload'}));
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ok: false, message: e?.message || 'write failed'}));
          }
        });
        req.on('error', () => {
          res.statusCode = 500;
          res.end(JSON.stringify({ok: false, message: 'request error'}));
        });
      });
    },
  };
}

export default defineConfig({
  root: rootPath('./web'),
  publicDir: rootPath('./public'),
  plugins: [react(), localUploadPlugin()],
  resolve: {alias: {'@': rootPath('./')}},
  css: {postcss: {plugins: [tailwindcss()]}},
  server: {watch: {usePolling: true}},
  build: {outDir: rootPath('./dist'), emptyOutDir: true},
});
