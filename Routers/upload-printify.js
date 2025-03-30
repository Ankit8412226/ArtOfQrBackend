const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const uploadPrintifyController = require("../Controller/upload-printify");

router.post("/", uploadPrintifyController);

module.exports = router;
