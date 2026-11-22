import { loanService } from '../service/loan.service.js';

export const loanController = {
  /**
   * Endpoint POST /api/v1/loans (Khusus User)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async borrowBook(req, res) {
    const userId = req.user.sub || req.user.id;
    const loan = loanService.borrowBook(userId, req.body || {});

    res.json(201, {
      success: true,
      message: 'Buku berhasil dipinjam',
      data: loan,
    });
  },

  /**
   * Endpoint PATCH /api/v1/loans/:id/return (Khusus User pemilik pinjaman)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async returnLoan(req, res) {
    const userId = req.user.sub || req.user.id;
    const loan = loanService.returnLoan(userId, req.params.id);

    res.json(200, {
      success: true,
      message: 'Buku berhasil dikembalikan',
      data: loan,
    });
  },

  /**
   * Endpoint GET /api/v1/loans/my (Khusus User)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getMyLoans(req, res) {
    const userId = req.user.sub || req.user.id;
    const { items, meta } = loanService.getMyLoans(userId, req.query);

    res.json(200, {
      success: true,
      message: 'Daftar peminjaman berhasil diambil',
      data: items,
      meta,
    });
  },

  /**
   * Endpoint GET /api/v1/admin/loans (Khusus Admin)
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async getAdminLoans(req, res) {
    const { items, meta } = loanService.getAdminLoans(req.query);

    res.json(200, {
      success: true,
      message: 'Data peminjaman berhasil diambil',
      data: items,
      meta,
    });
  },
};

export default loanController;
