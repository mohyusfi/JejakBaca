import { bookService } from '../service/book.service.js';

export const bookController = {
  /**
   * Endpoint GET /api/v1/books
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getBooks(req, res) {
    const userId = req.user?.sub || req.user?.id || null;
    const { items, meta } = bookService.getBooks(req.query, userId);

    res.json(200, {
      success: true,
      message: 'Daftar buku berhasil diambil',
      data: items,
      meta,
    });
  },

  /**
   * Endpoint GET /api/v1/books/:id
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getBookById(req, res) {
    const userId = req.user?.sub || req.user?.id || null;
    const book = bookService.getBookById(req.params.id, userId);

    res.json(200, {
      success: true,
      message: 'Detail buku berhasil diambil',
      data: book,
    });
  },

  /**
   * Endpoint POST /api/v1/books (Khusus Admin)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async createBook(req, res) {
    const book = bookService.createBook(req.body);

    res.json(201, {
      success: true,
      message: 'Buku berhasil ditambahkan',
      data: book,
    });
  },

  /**
   * Endpoint PUT /api/v1/books/:id (Khusus Admin)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async updateBook(req, res) {
    const book = bookService.updateBook(req.params.id, req.body);

    res.json(200, {
      success: true,
      message: 'Buku berhasil diperbarui',
      data: book,
    });
  },

  /**
   * Endpoint DELETE /api/v1/books/:id (Khusus Admin, soft-delete)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async deleteBook(req, res) {
    const result = bookService.deleteBook(req.params.id);

    res.json(200, {
      success: true,
      message: 'Buku berhasil dihapus',
      data: result,
    });
  },
};

export default bookController;
