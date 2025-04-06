import { Router } from 'express';
import { 
  getPlantRecommendations, 
  togglePlantActiveStatus,
  getActivePlantRecommendations 
} from '../controllers/plantRecommendationController';
import { getCustomPlantRecommendation } from '../controllers/customPlantController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/recommendations', getPlantRecommendations);

// Get custom plant recommendation
router.post('/custom', getCustomPlantRecommendation);

// Toggle plant active status
router.patch('/:id/activate', togglePlantActiveStatus);

// Get active plant recommendations
router.get('/active', getActivePlantRecommendations);

export default router; 