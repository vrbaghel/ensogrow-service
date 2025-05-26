import express from 'express';
import { authenticateUser } from '../middleware/auth';
import {
  getPlantRecommendations,
  togglePlantActiveStatus,
  getActivePlantRecommendations,
  markStepAsCompleted,
  getPlantDetail,
  analyzePlantImage
} from '../controllers/plantController';
import { getCustomPlantRecommendation } from "../controllers/customPlantController";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Plant image analysis route (must come before /:id)
router.post('/:plantId/diagnose', analyzePlantImage);

// Plant recommendation routes
router.post('/recommendations', getPlantRecommendations);
router.post('/custom', getCustomPlantRecommendation);
// Plant management routes
router.get('/active', getActivePlantRecommendations);
router.get('/:id', getPlantDetail);
router.patch('/:id/activate', togglePlantActiveStatus);
router.patch('/:plantId/steps/:stepId/complete', markStepAsCompleted);

export default router; 