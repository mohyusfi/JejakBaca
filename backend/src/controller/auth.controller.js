import { authService } from '../service/auth.service.js';

export const authController = {
  /**
   * Endpoint POST /api/v1/auth/register
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async register(req, res) {
    const payload = req.body || {};
    const result = await authService.register(payload);

    res.json(201, {
      success: true,
      message: 'Registrasi berhasil',
      data: result,
    });
  },

  /**
   * Endpoint POST /api/v1/auth/login
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async login(req, res) {
    const payload = req.body || {};
    const result = await authService.login(payload);

    res.json(200, {
      success: true,
      message: 'Login berhasil',
      data: result,
    });
  },

  /**
   * Endpoint GET /api/v1/auth/me
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async me(req, res) {
    const userId = req.user?.sub || req.user?.id;
    const profile = authService.getProfile(userId);

    res.json(200, {
      success: true,
      message: 'Profil berhasil diambil',
      data: profile,
    });
  },
};

export default authController;
