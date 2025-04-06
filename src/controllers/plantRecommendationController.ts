import { GoogleGenAI } from '@google/genai';
import { Request, Response } from 'express';
import PlantRecommendation from '../models/PlantRecommendation';

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
    
    Please recommend a list of plants that would grow optimally in these conditions. 
    For each plant, include:
    1. Plant name
    2. Brief description
    3. Success rate in percentage
    4. A detailed step-by-step journey of growing this plant, including:
       - Preparation steps (soil, tools, etc.)
       - Planting process
       - Daily/weekly care routine
       - Growth milestones
       - Harvesting instructions (if applicable)
    5. Growing difficulty level
    
    IMPORTANT: Return ONLY a valid JSON array of objects with these exact properties:
    [
      {
        "isValid": true,
        "name": "Plant Name",
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

    // Try to parse the response, handling potential JSON parsing errors
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

    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', response.text);
      throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }

    // Process and save each recommendation as a separate document
    const savedRecommendations = await Promise.all(
      parsedRecommendations.map(async (rec: any) => {
        // Validate required fields
        if (!rec.name || !rec.description || !rec.successRate || !rec.steps || !rec.difficultyLevel) {
          throw new Error('Missing required fields in recommendation');
        }

        // Process steps
        const processedSteps = rec.steps.map((step: any) => ({
          title: String(step.title || '').trim(),
          description: String(step.description || '').trim(),
          estimatedTime: String(step.estimatedTime || '').trim(),
          isCompleted: false
        }));

        // Create and save a new document for each recommendation
        const plantRecommendation = new PlantRecommendation({
          location,
          sunlightHours: Number(sunlightHours),
          availableSpace,
          plantName: String(rec.name).trim(),
          description: String(rec.description).trim(),
          successRate: String(rec.successRate).trim(),
          steps: processedSteps,
          difficultyLevel: String(rec.difficultyLevel).trim(),
          isValid: rec.isValid !== false // Default to true if not specified
        });

        return await plantRecommendation.save();
      })
    );

    // Get the top 5 recommendations (sorted by success rate)
    const topRecommendations = savedRecommendations
      .sort((a, b) => {
        const rateA = parseInt(a.successRate);
        const rateB = parseInt(b.successRate);
        return rateB - rateA;
      })
      .slice(0, 5);

    res.status(200).json({
      message: 'Plant recommendations generated successfully',
      data: topRecommendations
    });
  } catch (error) {
    console.error('Error generating plant recommendations:', error);
    
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
      message: 'Error generating plant recommendations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 