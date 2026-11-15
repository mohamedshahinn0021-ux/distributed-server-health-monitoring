import express from 'express';
import {
  createServer,
  getAllServers,
  getServerById,
  updateServer,
  toggleServerMonitoring,
  deleteServer,
} from '../controllers/serverController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/servers - List all servers
router.get('/', getAllServers);

// GET /api/servers/:id - Get server details
router.get('/:id', getServerById);

// POST /api/servers - Create new server (Protected)
router.post('/', authMiddleware, createServer);

// PUT /api/servers/:id - Update server (Protected)
router.put('/:id', authMiddleware, updateServer);

// PATCH /api/servers/:id/toggle - Toggle monitoring status (Protected)
router.patch('/:id/toggle', authMiddleware, toggleServerMonitoring);

// DELETE /api/servers/:id - Delete server (Protected)
router.delete('/:id', authMiddleware, deleteServer);

export default router;
