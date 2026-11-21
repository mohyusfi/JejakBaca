import { healthService } from '../service/health.service.js';

export const healthController = {
  /**
   * Endpoint GET /api/v1/health
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getHealth(req, res) {
    const healthData = healthService.checkHealth();
    res.json(200, {
      success: true,
      message: 'Server sehat',
      data: healthData,
    });
  },
};

export default healthController;
