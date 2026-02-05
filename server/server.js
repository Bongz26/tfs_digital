// server.js
const express = require('express');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Routes
const purchaseOrdersRouter = require('./routes/purchaseOrders');
app.use('/api/purchase-orders', purchaseOrdersRouter);

// Test route
app.get('/', (req, res) => res.send('Server is running!'));

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));
