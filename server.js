const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const useUploadRouter = require("./Routers/upload");
const getMockUrl = require("./Routers/getMockup");
const uploadImageRouter = require("./Routers/uploadImage");
const useUploadPrintifyRouter = require("./Routers/upload-printify");
const stripeRouter = require("./Routers/stripeRoutes.js"); // Import the new Stripe router
const app = express();

const axios = require("axios");
require("dotenv").config();

// CORS configuration
const corsOptions = {
  origin: "http://localhost:3000", // Allow requests from localhost:3000
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Use CORS middleware with options
app.use(cors(corsOptions));

app.use(bodyParser.json({ limit: "50mb", extended: true }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(bodyParser.text({ limit: "200mb" }));

app.use(express.json());

// Route-specific timeout middleware

/*step 1: upload image on supabase 
step 2: get imageUrl from supabase
step 3 upload image on printfull*/

app.use("/uploadImage", uploadImageRouter);
app.use("/getMockup", getMockUrl);
app.use("/upload", useUploadRouter);
app.use("/upload-printify", useUploadPrintifyRouter);
app.use("/stripe", stripeRouter); // Mount the Stripe router

// Add test route
app.get("/", (req, res) => {
  res.json({ message: "Server is running successfully!" });
});

// Start the server
app.listen(process.env.PORT || 3001, () => {
  console.log(`Server is running on port ${process.env.PORT || 3001}`);
});
