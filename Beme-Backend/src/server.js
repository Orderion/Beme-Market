require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
// app.use('/api/products', require('./routes/products')); // future

// Test Route
app.get('/', (req, res) => res.send('Beme Market API Running'));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
