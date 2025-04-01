const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client with your project's URL and anon/public key
const supabaseUrl = "https://peflgfeieqtklcpkhszz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZmxnZmVpZXF0a2xjcGtoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMDEzNzksImV4cCI6MjA0Njc3NzM3OX0.OlEbttWuDvHHy9svUAr2quK4IrmRgkGUI0i8Z9LHfrU";
const supabase = createClient(supabaseUrl, supabaseKey);

const PRINTFUL_API_KEY = "VLUOC2erat9bErXekeiQ3V2fmQ82vz6Vt3Htjv5o";
const PRINTFUL_STORE_ID = "14805728";
const PRINTFUL_BASE_URL = "https://api.printful.com";

// Create axios instance with default headers
const printfulClient = axios.create({
  baseURL: PRINTFUL_BASE_URL,
  headers: {
    Authorization: `Bearer ${PRINTFUL_API_KEY}`,
  },
});

// Product configurations with pricing information
const productConfigs = [
  {
    product_id: 223,
    name: "Premium T-Shirt",
    retail_price: 24.99,
    variants: {
      8024: { size: "S", price: 14.5 },
      8025: { size: "M", price: 14.5 },
      8026: { size: "L", price: 14.5 },
      8027: { size: "XL", price: 14.5 },
      8028: { size: "2XL", price: 16.0 },
    },
    body: {
      variant_ids: [8024, 8025, 8026, 8027, 8028],
      printfile_id: 1,
      format: "jpg",
      width: 0,
      product_options: {},
      files: [
        {
          placement: "front",
          position: {
            area_width: 1800,
            area_height: 2400,
            width: 1200,
            height: 1600,
            top: 0,
            left: 300,
          },
        },
      ],
    },
  },
  {
    product_id: 206,
    name: "Embroidered Hat",
    retail_price: 19.99,
    variants: {
      7853: { size: "One Size", price: 12.95 },
    },
    body: {
      variant_ids: [7853],
      printfile_id: 75,
      format: "jpg",
      width: 0,
      product_options: {},
      files: [
        {
          placement: "embroidery_front_large",
          position: {
            area_width: 1650,
            area_height: 600,
            width: 825,
            height: 600,
            top: 0,
            left: 412,
          },
        },
      ],
    },
  },
];

// 1. Get Synced Products API - Optimized
const getSyncedProducts = async (req, res) => {
  try {
    const response = await printfulClient.get(
      `/store/products?store_id=${PRINTFUL_STORE_ID}`
    );

    // Add pricing information from our configurations
    const products = response.data.result.map((product) => {
      const config = productConfigs.find(
        (cfg) => cfg.product_id === product.sync_product.product_id
      );
      if (config) {
        product.pricing = {
          retail_price: config.retail_price,
          variants: config.variants,
        };
      }
      return product;
    });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Error fetching synced products:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch synced products",
      details: error.response?.data || error.message,
    });
  }
};

// 2. Generate Mockups API - Optimized with pricing
const generateMockups = async (req, res) => {
  try {
    const { file_name, contents } = req.body;

    if (!contents || !file_name) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
      });
    }

    // Upload to Supabase
    const imageBlob = Buffer.from(contents.split(";base64,")[1], "base64");
    const uniqueFileName = `${Date.now()}-${file_name}`;

    const { data, error } = await supabase.storage
      .from("Images")
      .upload(uniqueFileName, imageBlob, {
        upsert: true,
        contentType: "image/png",
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ error: "Image upload failed" });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("Images")
      .getPublicUrl(data.path);

    const imageUrl = urlData.publicUrl;

    // Upload to Printful
    const printfulResponse = await printfulClient.post(
      `/files?store_id=${PRINTFUL_STORE_ID}`,
      { url: imageUrl }
    );

    // Batch process for mockup generation
    const mockupPromises = productConfigs.map(async (config) => {
      try {
        // Add image URL to files configuration
        const mockupConfig = {
          ...config.body,
          files: config.body.files.map((file) => ({
            ...file,
            image_url: imageUrl,
          })),
        };

        const response = await printfulClient.post(
          `/mockup-generator/create-task/${config.product_id}?store_id=${PRINTFUL_STORE_ID}`,
          mockupConfig
        );

        return {
          product_id: config.product_id,
          product_name: config.name,
          pricing: {
            retail_price: config.retail_price,
            variants: config.variants,
          },
          success: true,
          mockupTaskKey: response.data.result.task_key,
          placement: mockupConfig.files[0].placement,
          message: `Mockup generated successfully for product ID: ${config.product_id}`,
        };
      } catch (error) {
        console.error(
          `Error generating mockup for product ${config.product_id}:`,
          error
        );
        return {
          product_id: config.product_id,
          product_name: config.name,
          success: false,
          error: error.message,
          message: `Failed to generate mockup for product ID: ${config.product_id}`,
        };
      }
    });

    const mockupResults = await Promise.allSettled(mockupPromises);

    const successfulMockups = mockupResults
      .filter((result) => result.status === "fulfilled" && result.value.success)
      .map((result) => result.value);

    const failedMockups = mockupResults
      .filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value.success)
      )
      .map((result) =>
        result.status === "rejected" ? { error: result.reason } : result.value
      );

    return res.status(200).json({
      success: true,
      image_url: imageUrl,
      printful_file_id: printfulResponse.data.result.id,
      results: {
        successful_mockups: successfulMockups,
        failed_mockups: failedMockups,
        total_products: mockupResults.length,
        successful_count: successfulMockups.length,
        failed_count: failedMockups.length,
      },
    });
  } catch (error) {
    console.error("Main process error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to complete mockup generation process",
      details: error.message,
    });
  }
};

// 3. Get Shipping Rates API - Optimized
const getShippingRates = async (req, res) => {
  try {
    const { recipient, items } = req.body;

    if (!recipient || !items) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        details: {
          recipient: !recipient ? "Missing recipient information" : undefined,
          items: !items ? "Missing items" : undefined,
          store_id: PRINTFUL_STORE_ID,
        },
      });
    }

    const response = await printfulClient.post(
      `/shipping/rates?store_id=${PRINTFUL_STORE_ID}`,
      { recipient, items }
    );

    return res.status(200).json({
      success: true,
      rates: response.data.result,
    });
  } catch (error) {
    console.error("Shipping rates error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get shipping rates",
      details: error.response?.data || error.message,
    });
  }
};

// 4. Place Order API - Optimized
const placeOrder = async (req, res) => {
  try {
    const { recipient, items, shipping_option_id } = req.body;

    if (!recipient || !items || !shipping_option_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        details: {
          recipient: !recipient ? "Missing recipient information" : undefined,
          items: !items ? "Missing items" : undefined,
          shipping_option_id: !shipping_option_id
            ? "Missing shipping option"
            : undefined,
        },
      });
    }

    const response = await printfulClient.post(
      `/orders?store_id=${PRINTFUL_STORE_ID}`,
      {
        recipient,
        items,
        shipping: shipping_option_id,
      }
    );

    return res.status(200).json({
      success: true,
      order: response.data.result,
    });
  } catch (error) {
    console.error("Order placement error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to place order",
      details: error.response?.data || error.message,
    });
  }
};

// Optimized mockup results fetching
const getMockupResults = async (req, res) => {
  try {
    // Get payload from query params and parse it
    const payload = JSON.parse(req.query.payload);
    console.log("Received payload:", payload);

    if (!payload || !Array.isArray(payload)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payload. Expected an array of successful mockups.",
      });
    }

    const mockupResults = await Promise.all(
      payload.map(async (mockup) => {
        const mockupUrl = await getMockupUrl(mockup.mockupTaskKey);
        return {
          product_id: mockup.product_id,
          product_name: mockup.product_name,
          pricing: mockup.pricing,
          mockupUrl,
          placement: mockup.placement,
          message: mockup.message,
        };
      })
    );

    const successfulMockups = mockupResults.filter((m) => m.mockupUrl);
    const failedMockups = mockupResults.filter((m) => !m.mockupUrl);

    return res.status(200).json({
      success: true,
      mockups: {
        successful: successfulMockups,
        failed: failedMockups,
        total: mockupResults.length,
        successful_count: successfulMockups.length,
        failed_count: failedMockups.length,
      },
    });
  } catch (error) {
    console.error("Error getting mockup results:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get mockup results",
      details: error.message,
    });
  }
};

// Optimized mockup URL fetching with parallel processing
const getMockupUrl = async (taskKey) => {
  const maxAttempts = 10;
  const waitTime = 1000; // 1 second between attempts

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await printfulClient.get(
        `/mockup-generator/task?task_key=${taskKey}&store_id=${PRINTFUL_STORE_ID}`
      );

      if (response.data.result.status === "completed") {
        return response.data.result.mockups[0].mockup_url;
      }

      if (response.data.result.status === "failed") {
        console.error("Mockup generation failed:", response.data.result);
        return null;
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    } catch (error) {
      console.error(
        `Error checking mockup status (attempt ${attempt + 1}):`,
        error.message
      );

      // Wait before retry after error
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  console.error(
    `Mockup generation timed out after ${maxAttempts} attempts for task: ${taskKey}`
  );
  return null;
};

module.exports = {
  getSyncedProducts,
  generateMockups,
  getShippingRates,
  placeOrder,
  getMockupResults,
};
