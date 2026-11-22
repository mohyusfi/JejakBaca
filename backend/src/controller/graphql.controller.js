import { graphqlService } from '../service/graphql.service.js';
import { ValidationError } from '../middleware/errorHandler.js';

/**
 * Memeriksa apakah nilai adalah plain object
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const graphqlController = {
  /**
   * Endpoint POST /graphql (Read-Only Query Aggregator)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async handleGraphQL(req, res) {
    const body = req.body;
    const details = [];

    if (!isPlainObject(body)) {
      throw new ValidationError('Payload GraphQL harus berupa objek JSON', [
        { field: 'body', message: 'Body request harus berupa objek JSON yang valid' },
      ]);
    }

    if (typeof body.query !== 'string' || !body.query.trim()) {
      details.push({ field: 'query', message: 'Field query wajib diisi dan tidak boleh kosong' });
    }

    if (body.variables !== undefined && body.variables !== null && !isPlainObject(body.variables)) {
      details.push({ field: 'variables', message: 'Field variables harus berupa objek JSON' });
    }

    if (
      body.operationName !== undefined &&
      body.operationName !== null &&
      typeof body.operationName !== 'string'
    ) {
      details.push({ field: 'operationName', message: 'Field operationName harus berupa string' });
    }

    if (details.length > 0) {
      throw new ValidationError('Validasi request GraphQL gagal', details);
    }

    const result = await graphqlService.executeQuery(
      {
        query: body.query,
        variables: body.variables,
        operationName: body.operationName,
      },
      { user: req.user || null }
    );

    res.json(200, result);
  },
};

export default graphqlController;
