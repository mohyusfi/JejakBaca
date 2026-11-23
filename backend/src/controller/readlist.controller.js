import { readlistService } from '../service/readlist.service.js';

export const readlistController = {
  /**
   * Endpoint GET /api/v1/readlist (Khusus User)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getReadlist(req, res) {
    const userId = req.user.sub || req.user.id;
    const { items, meta } = readlistService.getReadlist(userId, req.query);

    res.json(200, {
      success: true,
      message: 'Readlist berhasil diambil',
      data: items,
      meta,
    });
  },

  /**
   * Endpoint POST /api/v1/readlist (Khusus User)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async addToReadlist(req, res) {
    const userId = req.user.sub || req.user.id;
    const item = await readlistService.addToReadlist(userId, req.body);

    res.json(201, {
      success: true,
      message: 'Buku berhasil ditambahkan ke readlist',
      data: item,
    });
  },

  /**
   * Endpoint DELETE /api/v1/readlist/:workId (Khusus User)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async removeFromReadlist(req, res) {
    const userId = req.user.sub || req.user.id;
    const result = readlistService.removeFromReadlist(userId, req.params.workId);

    res.json(200, {
      success: true,
      message: 'Buku berhasil dihapus dari readlist',
      data: result,
    });
  },
};

export default readlistController;
