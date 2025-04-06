import Plant from '../models/Plant';
import { GoogleGenAI } from '@google/genai';
import { Request, Response } from 'express';


export const getPlantRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenAI({ apiKey });

    const { location, sunlightHours, availableSpace } = req.body;

    // Validate input
    if (!location || !sunlightHours || !availableSpace) {
      res.status(400).json({ 
        message: 'Missing required fields: location, sunlightHours, availableSpace' 
      });
      return;
    }

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
    ]
    
    Each step should be a complete instruction that can be tracked independently.
    Do not include any markdown formatting, code blocks, or additional text. Return ONLY the JSON array.`;

    console.log('Sending prompt to Gemini:', prompt);

    // Get model and generate content
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    if (!response.text) {
      throw new Error('No response text from Gemini API');
    }

    console.log('Raw Gemini response:', response.text);

    // Try to parse the response
    let parsedRecommendations;
    try {
      // First, try to find a JSON array in the response
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      // Clean the JSON string
      const jsonStr = jsonMatch[0]
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      console.log('Extracted JSON string:', jsonStr);

      // Parse the JSON
      parsedRecommendations = JSON.parse(jsonStr);

      // Validate the structure
      if (!Array.isArray(parsedRecommendations)) {
        throw new Error('Parsed data is not an array');
      }

      // Validate each recommendation
      parsedRecommendations.forEach((rec: any) => {
        if (!rec.name || !rec.description || !rec.successRate || !rec.steps || !rec.difficultyLevel) {
          throw new Error('Missing required fields in recommendation');
        }
      });

    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', response.text);
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
          location,
          sunlightHours: Number(sunlightHours),
          availableSpace,
          plantName: String(rec.name).trim(),
          description: String(rec.description).trim(),
          successRate: String(rec.successRate).trim(),
          steps: processedSteps,
          difficultyLevel: String(rec.difficultyLevel).trim(),
          isValid: true
        });

        await plant.save();
        return plant;
      })
    );

    res.status(200).json({
      message: 'Plants created successfully',
      data: savedPlants
    });
  } catch (error) {
    console.error('Error creating plants:', error);
    
    // Handle specific error cases
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

export const togglePlantActiveStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Plant ID is required' });
      return;
    }

    const plant = await Plant.findById(id);
    if (!plant) {
      res.status(404).json({ message: 'Plant not found' });
      return;
    }

    // Toggle the isActive status
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

export const getActivePlantRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const activePlants = await Plant.find({ isActive: true });
    
    res.status(200).json({
      message: 'Active plants retrieved successfully',
      data: activePlants
    });
  } catch (error) {
    console.error('Error retrieving active plants:', error);
    res.status(500).json({ 
      message: 'Error retrieving active plants',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const markStepAsCompleted = async (req: Request, res: Response): Promise<void> => {
  try {
    const { plantId, stepId } = req.params;

    if (!plantId || !stepId) {
      res.status(400).json({ message: 'Plant ID and Step ID are required' });
      return;
    }

    const plant = await Plant.findById(plantId);
    if (!plant) {
      res.status(404).json({ message: 'Plant not found' });
      return;
    }

    // Find the step and update its status
    const stepIndex = plant.steps.findIndex(step => step.id === Number(stepId));
    if (stepIndex === -1) {
      res.status(404).json({ message: 'Step not found' });
      return;
    }

    // Update the step's isCompleted status
    plant.steps[stepIndex].isCompleted = true;
    await plant.save();

    res.status(200).json({
      message: 'Step marked as completed successfully',
      data: plant.steps[stepIndex]
    });
  } catch (error) {
    console.error('Error marking step as completed:', error);
    res.status(500).json({ 
      message: 'Error marking step as completed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 