const express = require("express");
const router = express.Router();
const uploadBase64ImageController=require('../Controller/uploadImage')
const fileUpload = require('express-fileupload');

router.use(express.json());
router.use(fileUpload());
router.post('/',uploadBase64ImageController)


module.exports=router