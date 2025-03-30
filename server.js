const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const useUploadRouter = require('./Routers/upload');
const getMockUrl=require('./Routers/getMockup');

const uploadImageRouter=require('./Routers/uploadImage');

const useUploadPrintifyRouter = require('./Routers/upload-printify');
const app = express();

const axios = require('axios');
const exp = require('constants');
require('dotenv').config();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'https://your-frontend-domain.com'],  // Allow both local and production front-end origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
  credentials: true,                        // Allow cookies and credentials
  optionsSuccessStatus: 200                 // For older browsers that may not support default 204 status
};

// Use CORS middleware
app.use(cors());
 
 
app.use(bodyParser.json({limit: '50mb', extended: true}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
app.use(bodyParser.text({ limit: '200mb' }));

 
app.use(express.json());

// Route-specific timeout middleware

/*step 1: upload image on supabase 
step 2: get imageUrl from supabase
step 3 upload image on printfull*/

app.use('/uploadImage',uploadImageRouter);
app.use('/getMockup',getMockUrl);
// Endpoint for uploading the font
app.use('/upload', useUploadRouter);
app.use('/upload-printify', useUploadPrintifyRouter);








// Start the server
app.listen(process.env.PORT || 3001, () => {
  console.log(`Server is running on port ${process.env.PORT || 3001}`);
});

