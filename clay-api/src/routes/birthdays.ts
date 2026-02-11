import { Router } from 'express';
import { activityRequest, type ActivityResponse } from '../clay-client.js';

const router = Router();

// GET /birthdays — upcoming birthdays from activity feed
router.get('/', async (req, res, next) => {
  try {
    const params: Record<string, string | number | undefined> = {
      type: 'birthday',
      limit: req.query.limit ? Number(req.query.limit) : 100,
      after: req.query.after ? Number(req.query.after) : undefined,
      status: 'active',
    };

    const response = await activityRequest<ActivityResponse>('/activity', { params });

    const birthdays = response.results.map((item) => ({
      id: item.id,
      date: new Date(item.itemDate * 1000).toISOString(),
      contact: item.metadata.contact
        ? {
            id: item.metadata.contact.id,
            name: item.metadata.contact.displayName,
            avatarURL: item.metadata.contact.avatarURL,
          }
        : null,
      content: item.metadata.content,
    }));

    res.json({
      total: response.total,
      count: birthdays.length,
      birthdays,
      nextPageAfter:
        response.results.length > 0
          ? response.results[response.results.length - 1].itemDate
          : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
