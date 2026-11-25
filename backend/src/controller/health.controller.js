import { healthService } from '../service/health.service.js';

export const healthController = {
  /**
   * Endpoint GET /api/v1/health (deprecated, tetap aktif untuk backward compatibility)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getHealth(req, res) {
    const healthData = healthService.checkHealth();
    res.setHeader('X-API-Version', 'v1');
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</api/v2/health>; rel="successor-version"');

    res.json(200, {
      success: true,
      message: 'Server sehat',
      data: healthData,
    });
  },

  /**
   * Endpoint GET /api/v2/health
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getHealthV2(req, res) {
    const healthData = healthService.checkHealthV2();
    res.setHeader('X-API-Version', 'v2');

    res.json(200, {
      success: true,
      message: 'Server sehat',
      data: healthData,
    });
  },
};

export default healthController;
