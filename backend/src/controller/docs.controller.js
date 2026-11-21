import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotFoundError } from '../middleware/errorHandler.js';

/**
 * Mencari path berkas openapi.yaml
 * @returns {string | null}
 */
function findOpenApiPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(currentDir, '../../../docs/api/openapi.yaml'),
    path.resolve(process.cwd(), 'docs/api/openapi.yaml'),
    path.resolve(process.cwd(), '../docs/api/openapi.yaml'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export const docsController = {
  /**
   * Endpoint GET /api/openapi.yaml
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async serveOpenApiYaml(req, res) {
    const filePath = findOpenApiPath();
    if (!filePath) {
      throw new NotFoundError('Berkas spesifikasi openapi.yaml tidak ditemukan di sistem');
    }

    const yamlContent = fs.readFileSync(filePath, 'utf-8');
    res.send(200, 'application/yaml; charset=utf-8', yamlContent);
  },

  /**
   * Endpoint GET /api/docs (Dokumentasi Interaktif Scalar / Swagger UI)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async serveDocs(req, res) {
    const htmlContent = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dokumentasi API Perpustakaan UNTAD</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>">
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi.yaml"
      data-configuration='{"theme":"purple","layout":"modern","showSidebar":true}'></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

    res.send(200, 'text/html; charset=utf-8', htmlContent);
  },
};

export default docsController;
