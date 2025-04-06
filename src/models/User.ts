import { Schema, model, Document, Types } from 'mongoose';
import { IPlant } from './Plant';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  // Survey information
  location: string;
  sunlightHours: number;
  availableSpace: string;
  // References to user's plants
  plants: Types.ObjectId[] | IPlant[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  // Survey information
  location: {
    type: String,
    required: false // Optional until survey is completed
  },
  sunlightHours: {
    type: Number,
    required: false
  },
  availableSpace: {
    type: String,
    required: false
  },
  // References to user's plants
  plants: [{
    type: Schema.Types.ObjectId,
    ref: 'Plant'
  }]
}, {
  timestamps: true
});

export default model<IUser>('User', userSchema); 