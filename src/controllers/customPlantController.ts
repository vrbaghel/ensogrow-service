import { GoogleGenAI } from '@google/genai';
import { Request, Response } from 'express';
import Plant from '../models/Plant';

export const getCustomPlantRecommendation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenAI({ apiKey });

    const { location, sunlightHours, availableSpace, plantName } = req.body;

    // Validate input
    if (!location || !sunlightHours || !availableSpace || !plantName) {
      res.status(400).json({ 
        message: 'Missing required fields: location, sunlightHours, availableSpace, plantName' 
      });
      return;
    }

    // Create prompt for Gemini AI
    const prompt = `Given the following conditions:
    - Location: ${location}
    - Hours of direct sunlight: ${sunlightHours} hours
    - Available space: ${availableSpace}
    - Plant to grow: ${plantName}
    
    First, validate if "${plantName}" is a valid plant name. If it's not a real plant or contains garbage values, return an error response.
    
    If it's a valid plant, provide detailed information about growing this specific plant in these conditions. Include:
    1. A brief description of the plant
    2. Success rate in these specific conditions
    3. A detailed step-by-step journey of growing this plant, including:
       - Preparation steps (soil, tools, etc.)
       - Planting process
       - Daily/weekly care routine
       - Growth milestones
       - Harvesting instructions (if applicable)
    4. Growing difficulty level
    
    IMPORTANT: Return ONLY a valid JSON object with these exact properties:
    {
      "isValid": true,
      "name": "${plantName}",
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
    
    If the plant name is invalid or contains garbage values, return:
    {
      "isValid": false,
      "error": "Invalid plant name. Please provide a valid plant name."
    }
    
    Each step should be a complete instruction that can be tracked independently.
    Do not include any markdown formatting, code blocks, or additional text. Return ONLY the JSON object.`;

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
    let parsedRecommendation;
    try {
      // First, try to find a JSON object in the response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      // Clean the JSON string
      const jsonStr = jsonMatch[0]
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      console.log('Extracted JSON string:', jsonStr);

      // Parse the JSON
      parsedRecommendation = JSON.parse(jsonStr);

      // Validate the structure
      if (typeof parsedRecommendation !== 'object') {
        throw new Error('Parsed data is not an object');
      }

      // Check if the plant name is valid
      if (!parsedRecommendation.isValid) {
        res.status(400).json({
          message: 'Invalid plant name',
          error: parsedRecommendation.error || 'Please provide a valid plant name'
        });
        return;
      }

      // Validate required fields for valid plant
      if (!parsedRecommendation.name || !parsedRecommendation.description || 
          !parsedRecommendation.successRate || !parsedRecommendation.steps || 
          !parsedRecommendation.difficultyLevel) {
        throw new Error('Missing required fields in recommendation');
      }

    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', response.text);
      throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }

    // Process steps
    const processedSteps = parsedRecommendation.steps.map((step: any, index: number) => ({
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
      plantName: String(parsedRecommendation.name).trim(),
      description: String(parsedRecommendation.description).trim(),
      successRate: String(parsedRecommendation.successRate).trim(),
      steps: processedSteps,
      difficultyLevel: String(parsedRecommendation.difficultyLevel).trim(),
      isValid: parsedRecommendation.isValid
    });

    await plant.save();

    res.status(200).json({
      message: 'Custom plant created successfully',
      data: plant
    });
  } catch (error) {
    console.error('Error creating custom plant:', error);
    
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
      message: 'Error creating custom plant',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 