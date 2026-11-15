import express from 'express';
import {
  getMonitoringStatus,
  getServerMonitoringDetails,
  triggerManualCheck,
  getServerHistory,
} from '../controllers/monitoringController.js';

const router = express.Router();

// GET /api/monitoring/status - Dashboard aggregated overview
router.get('/status', getMonitoringStatus);

// GET /api/monitoring/:serverId - Single server monitoring state
router.get('/:serverId', getServerMonitoringDetails);

// POST /api/monitoring/:serverId/check - Trigger immediate manual health check
router.post('/:serverId/check', triggerManualCheck);

// GET /api/monitoring/history/:serverId - Historical health records with date filters
router.get('/history/:serverId', getServerHistory);

export default router;
