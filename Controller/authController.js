const { supabase } = require("../config/supabaseClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
};

// User Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Fetch user from database
    const { data, error } = await supabase
      .from("users")
      .select("id, email, password, name")
      .eq("email", email)
      .single();

    if (error || !data) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, data.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = generateToken(data);

    // User data to return (exclude password)
    const userData = {
      id: data.id,
      email: data.email,
      name: data.name,
    };

    return res.status(200).json({
      message: "Login successful",
      user: userData,
      token: token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// User Registration
const registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const { data, error } = await supabase
      .from("users")
      .insert([{ email, password: hashedPassword, name }])
      .select(); // Explicitly select the inserted data

    if (error) {
      return res
        .status(400)
        .json({ message: "Signup failed", error: error.message });
    }

    if (!data || data.length === 0) {
      return res
        .status(500)
        .json({ message: "User creation failed, no data returned" });
    }

    // Generate JWT token
    const token = generateToken(data[0]);

    // User data to return (exclude password)
    const userData = {
      id: data[0].id,
      email: data[0].email,
      name: data[0].name,
    };

    return res.status(201).json({
      message: "User created successfully",
      user: userData,
      token: token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// User Logout
const logoutUser = async (req, res) => {
  // With JWT, we don't need to do anything server-side for logout
  // The client should remove the token from storage
  return res.status(200).json({
    message: "Logout successful",
  });
};

// Get Current User
const getCurrentUser = async (req, res) => {
  try {
    // User is attached to req by the authMiddleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "No user authenticated",
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
};
