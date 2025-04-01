const express = require("express");
const router = express.Router();
const {
  stripeCheckoutController,
  successController,
  cancelController,
} = require("../Controller/stripeController.js");

// Middleware
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Routes
router.post("/create-checkout-session", stripeCheckoutController);
router.get("/success", successController);
router.get("/cancel", cancelController);

module.exports = router;
