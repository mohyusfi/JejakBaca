import { publicJournalService } from '../service/publicJournal.service.js';

export const publicJournalController = {
  /**
   * Endpoint GET /api/v1/public-journals
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async searchPublicJournals(req, res) {
    const { items, meta } = await publicJournalService.searchPublicJournals(req.query);

    res.json(200, {
      success: true,
      message: 'Jurnal publik berhasil diambil',
      data: items,
      meta,
    });
  },
};

export default publicJournalController;
