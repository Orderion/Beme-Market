import 'dotenv/config'; // loads .env automatically
import express from 'express';
import connectDB from './config/db.js'; // note the .js extension

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(express.json());

// Routes
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);
// app.use('/api/products', productsRoutes); // future

// Test route
app.get('/', (req, res) => res.send('Beme Market API Running'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
