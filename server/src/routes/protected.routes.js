import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/profile', (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

router.get('/officer', requireRole('admin', 'procurement_officer'), (req, res) => {
  res.json({ success: true, message: 'Procurement Officer access granted' });
});

router.get('/supplier', requireRole('admin', 'supplier'), (req, res) => {
  res.json({ success: true, message: 'Supplier access granted' });
});

router.get('/admin', requireRole('admin'), (req, res) => {
  res.json({ success: true, message: 'Admin access granted' });
});

export default router;
