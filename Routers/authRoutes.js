const express = require("express");
const authController = require("../Controller/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/sign-up", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/logout", authMiddleware, authController.logoutUser);
router.get("/me", authMiddleware, authController.getCurrentUser);

module.exports = router;
