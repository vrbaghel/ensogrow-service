import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import connectDB from './config/database';
import { authenticateUser, AuthRequest } from './middleware/auth';
import plantRoutes from './routes/plantRoutes';

// Load environment variables first
dotenv.config();

const app = express();

// Connect to MongoDB after environment variables are loaded
connectDB().catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Public routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to EnsoGrow Service API' });
});

// Protected routes
app.use('/api', authenticateUser);

// Example protected route
app.get('/api/protected', (req: AuthRequest, res: Response) => {
  res.json({ 
    message: 'This is a protected route',
    user: req.user // This will contain the Firebase user data
  });
});

// API routes
app.use('/api/plants', plantRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app; 