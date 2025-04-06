import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { 
  getPlantRecommendations, 
  togglePlantActiveStatus, 
  getActivePlantRecommendations,
  markStepAsCompleted,
  getPlantDetail
} from '../controllers/plantController';
import { getCustomPlantRecommendation } from '../controllers/customPlantController';

const router = Router();

// Get plant recommendations
router.post('/recommendations', getPlantRecommendations);

// Get custom plant recommendation
router.post('/custom', getCustomPlantRecommendation);

// Get active plants (must come before /:id)
router.get('/active', getActivePlantRecommendations);

// Get plant details
router.get('/:id', getPlantDetail);

// Toggle plant active status
router.patch('/:id/activate', togglePlantActiveStatus);

// Mark step as completed
router.patch('/:plantId/steps/:stepId/complete', markStepAsCompleted);

export default router; 