import { Schema, model, Document } from 'mongoose';

interface IStep {
  id: number;
  title: string;
  description: string;
  estimatedTime: string;
  isCompleted: boolean;
}

export interface IPlantRecommendation extends Document {
  location: string;
  sunlightHours: number;
  availableSpace: string;
  plantName: string;
  description: string;
  successRate: string;
  steps: IStep[];
  difficultyLevel: string;
  isValid: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const stepSchema = new Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  estimatedTime: { type: String, required: true },
  isCompleted: { type: Boolean, default: false }
}, { _id: false });

const plantRecommendationSchema = new Schema({
  location: { type: String, required: true },
  sunlightHours: { type: Number, required: true },
  availableSpace: { 
    type: String, 
    required: true,
    trim: true
  },
  plantName: { type: String, required: true },
  description: { type: String, required: true },
  successRate: { type: String, required: true },
  steps: [stepSchema],
  difficultyLevel: { type: String, required: true },
  isValid: { type: Boolean, default: true },
  isActive: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default model<IPlantRecommendation>('PlantRecommendation', plantRecommendationSchema); 