import { Router } from 'express';
import { searchRequest, type SearchResponse } from '../clay-client.js';

const router = Router();

// GET /contacts — search/list contacts
router.get('/', async (req, res, next) => {
  try {
    const params: Record<string, string | number | undefined> = {
      term: req.query.term as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      page: req.query.page ? Number(req.query.page) : 1,
      sort_by: (req.query.sort_by as string) ?? 'score',
      sort_direction: (req.query.sort_direction as string) ?? 'desc',
    };

    const response = await searchRequest<SearchResponse>('/search', { params });

    const contacts = response.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    }));

    res.json({
      total: response.hits.total,
      count: contacts.length,
      took_ms: response.took,
      contacts,
    });
  } catch (err) {
    next(err);
  }
});

// GET /contacts/:id — get single contact
router.get('/:id', async (req, res, next) => {
  try {
    const contact = await searchRequest<Record<string, unknown>>(`/contact/${req.params.id}`);
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

export default router;
