import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { 
  getPlantRecommendations, 
  togglePlantActiveStatus, 
  getActivePlantRecommendations,
  markStepAsCompleted 
} from '../controllers/plantController';
import { getCustomPlantRecommendation } from '../controllers/customPlantController';

const router = Router();

// Get plant recommendations
router.post('/', getPlantRecommendations);

// Toggle plant active status
router.patch('/:id/activate', togglePlantActiveStatus);

// Get active plants
router.get('/active', getActivePlantRecommendations);

// Get custom plant recommendation
router.post('/custom', getCustomPlantRecommendation);

// Mark step as completed
router.patch('/:plantId/steps/:stepId/complete', markStepAsCompleted);

export default router; 