const express = require("express");
const router = express.Router();
const {
    subscribeToNewsletter,
    getAllSubscribers
} = require("../Controller/newsLater.controller");

// Middleware
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Routes
router.post("/create-newsletter", subscribeToNewsletter);
router.get("/get-newsletter" , getAllSubscribers);


module.exports = router;
