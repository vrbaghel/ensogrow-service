import { Schema, model, Document } from 'mongoose';

export interface IPlant extends Document {
  location: string;
  sunlightHours: number;
  availableSpace: string;
  plantName: string;
  description: string;
  successRate: string;
  steps: Array<{
    id: number;
    title: string;
    description: string;
    estimatedTime: string;
    isCompleted: boolean;
  }>;
  difficultyLevel: string;
  isValid: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const plantSchema = new Schema({
  location: {
    type: String,
    required: true
  },
  sunlightHours: {
    type: Number,
    required: true
  },
  availableSpace: {
    type: String,
    required: true
  },
  plantName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  successRate: {
    type: String,
    required: true
  },
  steps: [{
    id: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    estimatedTime: {
      type: String,
      required: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    }
  }],
  difficultyLevel: {
    type: String,
    required: true
  },
  isValid: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default model<IPlant>('Plant', plantSchema); 