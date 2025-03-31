const express = require("express");
const router = express.Router();
const {
  getSyncedProducts,
  generateMockups,
  getMockupResults,
  getShippingRates,
  placeOrder
} = require('../Controller/uploadImage');
const fileUpload = require('express-fileupload');

// Middleware
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));
router.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  useTempFiles: false
}));

// Products Endpoints
// Fetch all synced products from Printful
router.get('/products', getSyncedProducts);

// Mockup Endpoints
// Generate mockups for all products with an image
router.post('/mockups', generateMockups);


router.get('/mockup-results', getMockupResults);


// Shipping Endpoints
// Get shipping rates for products
router.post('/shipping/rates', getShippingRates);


// Order Endpoints
// Place an order on Printful
router.post('/order', placeOrder);

module.exports = router;