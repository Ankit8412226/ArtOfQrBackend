const express = require("express");
const router = express.Router();
const {
    submitContactForm,
    getAllContactSubmissions
} = require("../Controller/contact.controller");

// Middleware
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Routes
router.post("/SubmitContact", submitContactForm,);
router.get("/getContact" , getAllContactSubmissions);


module.exports = router;
