const express = require("express");
const router = express.Router();
const { 
  getSyncedProducts, 
  generateMockups, 
  placeOrder 
} = require('../Controller/uploadImage');
const fileUpload = require('express-fileupload');

router.use(express.json());
router.use(fileUpload());

// Fetch all synced products from Printful
router.get('/products', getSyncedProducts);

// Generate mockups for a product
router.post('/mockups', generateMockups);

// Place an order on Printful
router.post('/order', placeOrder);

module.exports = router;
