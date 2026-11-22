import { publicBookService } from '../service/publicBook.service.js';

export const publicBookController = {
  /**
   * Endpoint GET /api/v1/public-books
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async searchPublicBooks(req, res) {
    const { items, meta } = await publicBookService.searchPublicBooks(req.query, req.user);

    res.json(200, {
      success: true,
      message: 'Buku publik berhasil diambil',
      data: items,
      meta,
    });
  },

  /**
   * Endpoint GET /api/v1/public-books/:workId
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getPublicBookById(req, res) {
    const book = await publicBookService.getPublicBookById(req.params.workId, req.user);

    res.json(200, {
      success: true,
      message: 'Detail buku publik berhasil diambil',
      data: book,
    });
  },
};

export default publicBookController;
