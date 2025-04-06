import { Router } from 'express';
import { getPlantRecommendations } from '../controllers/plantRecommendationController';
import { getCustomPlantRecommendation } from '../controllers/customPlantController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/recommendations', getPlantRecommendations);

// Get custom plant recommendation
router.post('/custom', getCustomPlantRecommendation);

export default router; 