require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', imageRoutes);
app.use('/api', apiRoutes);

// Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/install.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    storage: 'shopify',
    timestamp: new Date().toISOString()
  });
});

// Only start server if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on ${process.env.HOST || `http://localhost:${PORT}`}`);
    console.log('Using Shopify storage for images');
  });
}

// Export for Vercel
module.exports = app;
