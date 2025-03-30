const express = require("express");
const router = express.Router();
const getCreatedMockupsUrl=require('../Controller/getMockup');
const bodyParser = require('body-parser');


router.use(express.json());
router.get("/",getCreatedMockupsUrl);

module.exports= router;