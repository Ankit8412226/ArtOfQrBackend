const express = require("express");
const router = express.Router();
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const uploadController=require("../Controller/upload");

router.use(fileUpload());

router.post('/',uploadController );

router.get('/', (req, res) => {
  console.log("GET request received");
  res.send("GET request handled");
});

module.exports = router;
