import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Plant from '../models/Plant';
import User from '../models/User';
import { GoogleGenAI } from '@google/genai';
import { Types } from 'mongoose';

export const getPlantRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const firebaseUser = req.user;
    if (!firebaseUser) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Check if user exists and create if not
    const { location, sunlightHours, availableSpace } = req.body;
    let user = await User.findOne({ firebaseUid: firebaseUser.uid });

    if (!user) {
      // Create new user
      user = new User({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        location,
        sunlightHours,
        availableSpace,
        plants: []
      });
      await user.save();
    } else {
      // Update existing user's survey information
      user.location = location;
      user.sunlightHours = sunlightHours;
      user.availableSpace = availableSpace;
      await user.save();
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenAI({ apiKey });

    // Create prompt for Gemini AI
    const prompt = `Given the following conditions:
    - Location: ${location}
    - Hours of direct sunlight: ${sunlightHours} hours
    - Available space: ${availableSpace}
    
    Provide a list of 6-8 plants that would grow well in these conditions. For each plant, include:
    1. A brief description
    2. Success rate in these specific conditions
    3. A detailed step-by-step journey of growing this plant, including:
       - Preparation steps (soil, tools, etc.)
       - Planting process
       - Daily/weekly care routine
       - Growth milestones
       - Harvesting instructions (if applicable)
    4. Growing difficulty level
    
    IMPORTANT: Return ONLY a valid JSON array of objects with these exact properties:
    [
      {
        "name": "Plant name",
        "description": "Brief description",
        "successRate": "success rate in percentage",
        "steps": [
          {
            "title": "Step title",
            "description": "Detailed description of what needs to be done",
            "estimatedTime": "Time estimate (e.g., '2 weeks', '1 month')",
            "isCompleted": false
          }
        ],
        "difficultyLevel": "Difficulty level"
      }
    ]`;

    // Get model and generate content
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    if (!response.text) {
      throw new Error('No response text from Gemini API');
    }

    // Try to parse the response
    let parsedRecommendations;
    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const jsonStr = jsonMatch[0]
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      parsedRecommendations = JSON.parse(jsonStr);

      if (!Array.isArray(parsedRecommendations)) {
        throw new Error('Parsed data is not an array');
      }

      parsedRecommendations.forEach((rec: any) => {
        if (!rec.name || !rec.description || !rec.successRate || !rec.steps || !rec.difficultyLevel) {
          throw new Error('Missing required fields in recommendation');
        }
      });

    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }

    // Process and save each recommendation
    const savedPlants = await Promise.all(
      parsedRecommendations.map(async (rec: any) => {
        // Process steps
        const processedSteps = rec.steps.map((step: any, index: number) => ({
          id: index + 1,
          title: String(step.title || '').trim(),
          description: String(step.description || '').trim(),
          estimatedTime: String(step.estimatedTime || '').trim(),
          isCompleted: false
        }));

        // Create and save the plant
        const plant = new Plant({
          plantName: String(rec.name).trim(),
          description: String(rec.description).trim(),
          successRate: String(rec.successRate).trim(),
          steps: processedSteps,
          difficultyLevel: String(rec.difficultyLevel).trim(),
          isValid: true
        });

        await plant.save();

        // Add plant to user's plants array
        await User.findOneAndUpdate(
          { firebaseUid: firebaseUser.uid },
          { $push: { plants: plant._id } }
        );

        return plant;
      })
    );

    res.status(200).json({
      message: 'Plants created successfully',
      data: savedPlants
    });
  } catch (error) {
    console.error('Error creating plants:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        res.status(403).json({ 
          message: 'Authentication failed. Please check your Gemini API key.',
          error: error.message
        });
        return;
      }
      if (error.message.includes('API key')) {
        res.status(401).json({ 
          message: 'Invalid API key. Please check your Gemini API key configuration.',
          error: error.message
        });
        return;
      }
      if (error.message.includes('parse')) {
        res.status(422).json({ 
          message: 'Failed to parse Gemini response. The response format was invalid.',
          error: error.message
        });
        return;
      }
    }

    res.status(500).json({ 
      message: 'Error creating plants',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const togglePlantActiveStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const firebaseUser = req.user;

    if (!firebaseUser) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!id) {
      res.status(400).json({ message: 'Plant ID is required' });
      return;
    }

    // Check if user owns this plant
    const user = await User.findOne({ 
      firebaseUid: firebaseUser.uid,
      plants: new Types.ObjectId(id)
    });

    if (!user) {
      res.status(403).json({ message: 'Not authorized to modify this plant' });
      return;
    }

    const plant = await Plant.findById(id);
    if (!plant) {
      res.status(404).json({ message: 'Plant not found' });
      return;
    }

    plant.isActive = !plant.isActive;
    await plant.save();

    res.status(200).json({
      message: `Plant ${plant.isActive ? 'activated' : 'deactivated'} successfully`,
      data: plant
    });
  } catch (error) {
    console.error('Error toggling plant active status:', error);
    res.status(500).json({ 
      message: 'Error toggling plant active status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getActivePlantRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const firebaseUser = req.user;

    if (!firebaseUser) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get user's active plants
    const user = await User.findOne({ firebaseUid: firebaseUser.uid }).populate({
      path: 'plants',
      match: { isActive: true }
    });

    res.status(200).json({
      message: 'Active plants retrieved successfully',
      data: user?.plants || []
    });
  } catch (error) {
    console.error('Error retrieving active plants:', error);
    res.status(500).json({ 
      message: 'Error retrieving active plants',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const markStepAsCompleted = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { plantId, stepId } = req.params;
    const firebaseUser = req.user;

    if (!firebaseUser) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!plantId || !stepId) {
      res.status(400).json({ message: 'Plant ID and Step ID are required' });
      return;
    }

    // Check if user owns this plant
    const user = await User.findOne({ 
      firebaseUid: firebaseUser.uid,
      plants: new Types.ObjectId(plantId)
    });

    if (!user) {
      res.status(403).json({ message: 'Not authorized to modify this plant' });
      return;
    }

    const plant = await Plant.findById(plantId);
    if (!plant) {
      res.status(404).json({ message: 'Plant not found' });
      return;
    }

    // Find and update the step
    const step = plant.steps.find(s => s.id === Number(stepId));
    if (!step) {
      res.status(404).json({ message: 'Step not found' });
      return;
    }

    step.isCompleted = true;
    await plant.save();

    res.status(200).json({
      message: 'Step marked as completed',
      data: plant
    });
  } catch (error) {
    console.error('Error marking step as completed:', error);
    res.status(500).json({ 
      message: 'Error marking step as completed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getPlantDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const firebaseUser = req.user;
    console.log(firebaseUser, id);

    if (!firebaseUser) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!id) {
      res.status(400).json({ message: 'Plant ID is required' });
      return;
    }

    // Check if user owns this plant
    const user = await User.findOne({ 
      firebaseUid: firebaseUser.uid,
      plants: new Types.ObjectId(id)
    });

    if (!user) {
      res.status(403).json({ message: 'Not authorized to view this plant' });
      return;
    }

    const plant = await Plant.findById(id);
    if (!plant) {
      res.status(404).json({ message: 'Plant not found' });
      return;
    }

    res.status(200).json({
      message: 'Plant details retrieved successfully',
      data: plant
    });
  } catch (error) {
    console.error('Error retrieving plant details:', error);
    res.status(500).json({ 
      message: 'Error retrieving plant details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 