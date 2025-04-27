// backend/src/routes/couponRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const couponController = require("../Controller/couponController");

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);

// Admin routes - protected by authentication
router.get("/", couponController.getAllCoupons);
router.get("/:id", couponController.getCouponById);
router.post("/", couponController.createCoupon);
router.put("/:id", couponController.updateCoupon);
router.delete("/:id", couponController.deleteCoupon);
router.patch("/:id/toggle", couponController.toggleCouponStatus);

module.exports = router;
