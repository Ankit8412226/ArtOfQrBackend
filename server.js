const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");

// Load environment variables
dotenv.config();

// Route imports
const authRoutes = require("./Routers/authRoutes.js");
const protectedRoutes = require("./Routers/protectedRoutes.js");
const couponRoutes = require("./Routers/couponRoutes.js");
const couponController = require("./Controller/couponController.js");
const useUploadRouter = require("./Routers/upload");
const getMockUrl = require("./Routers/getMockup");
const uploadImageRouter = require("./Routers/uploadImage");
const useUploadPrintifyRouter = require("./Routers/upload-printify");
const stripeRouter = require("./Routers/stripeRoutes.js");
const newsletterRoutes = require("./Routers/newsLater.router.js");
const contactRoutes = require("./Routers/contactForm.router.js");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("dev"));
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

// Basic routes
app.get("/", (req, res) => {
  res.json({ message: "Server is running successfully!" });
});

app.get("/api", (req, res) => {
  res.json({ message: "Backend is running successfully" });
});

// PUBLIC COUPON VALIDATION ENDPOINT - No auth required
app.post("/api/validate-coupon/:code", couponController.validateCoupon);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/coupons", couponRoutes);

// Upload and mock routes
app.use("/uploadImage", uploadImageRouter);
app.use("/getMockup", getMockUrl);
app.use("/upload", useUploadRouter);
app.use("/upload-printify", useUploadPrintifyRouter);

// Payment and communication routes
app.use("/stripe", stripeRouter);
app.use("/newsletter", newsletterRoutes);
app.use("/contact", contactRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "Server error",
    error: process.env.NODE_ENV !== "production" ? err.message : {},
  });
});

// Running server
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    `Public coupon validation available at: http://localhost:${PORT}/api/validate-coupon/:code`
  );
});
