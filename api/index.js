// Vercel serverless function entry point
require('dotenv').config();
const app = require('../server');

module.exports = app;
