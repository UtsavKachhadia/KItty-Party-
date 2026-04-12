import { Router } from 'express';
import { exportToCSV, exportToMarkdown, exportHistory } from '../services/exportService.js';
import Run from '../models/Run.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/execution/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    const execution = await Run.findById(id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    if (
      execution.initiatorUser.toString() !== req.user.userId &&
      execution.targetUser.toString() !== req.user.userId
    ) {
      return res.status(403).json({ error: 'Not authorized to export this execution' });
    }

    if (format === 'csv') {
      const csv = await exportToCSV(id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=execution-${id}.csv`);
      return res.send(csv);
    } else if (format === 'md') {
      const md = await exportToMarkdown(id);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename=execution-${id}.md`);
      return res.send(md);
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or md.' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error during export' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { format } = req.query;
    if (!format || !['csv', 'md'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use csv or md.' });
    }

    const data = await exportHistory(req.user.userId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=history-${req.user.userId}.csv`);
    } else {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename=history-${req.user.userId}.md`);
    }
    
    return res.send(data);
  } catch (error) {
    console.error('Export history error:', error);
    res.status(500).json({ error: 'Internal server error during history export' });
  }
});

export default router;
