const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');



// Initialize Supabase client with your project's URL and anon/public key
const supabaseUrl = 'https://peflgfeieqtklcpkhszz.supabase.co';  // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZmxnZmVpZXF0a2xjcGtoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMDEzNzksImV4cCI6MjA0Njc3NzM3OX0.OlEbttWuDvHHy9svUAr2quK4IrmRgkGUI0i8Z9LHfrU';  // Replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);


const PRINTFUL_API_KEY = "VLUOC2erat9bErXekeiQ3V2fmQ82vz6Vt3Htjv5o";
const PRINTFUL_STORE_ID = '14805728';
const PRINTFUL_BASE_URL = 'https://api.printful.com';


// 1. Get Synced Products API
const getSyncedProducts = async (req, res) => {
  try {
    const response = await axios.get(
      `${PRINTFUL_BASE_URL}/store/products?store_id=${PRINTFUL_STORE_ID}`,
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );
    return res.status(200).json({
      success: true,
      products: response.data.result
    });
  } catch (error) {
    console.error('Error fetching synced products:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch synced products',
      details: error.response?.data || error.message
    });
  }
};





// Product configurations
const productConfigs = [
  {
    product_id: 223,
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
            left: 300
          }
        }
      ]
    }
  },
  {
    product_id: 206,
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
            left: 412
          }
        }
      ]
    }
  },

  // Add more product configurations as needed
];

// 2. Generate Mockups API
const generateMockups = async (req, res) => {
  try {
    const { file_name, contents } = req.body;

    if (!contents || !file_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // Upload to Supabase
    const imageBlob = Buffer.from(contents.split(';base64,')[1], 'base64');
    const uniqueFileName = `${Date.now()}-${file_name}`;

    const { data, error } = await supabase.storage
      .from('Images')
      .upload(uniqueFileName, imageBlob, {
        upsert: true,
        contentType: 'image/png'
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ error: "Image upload failed" });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('Images')
      .getPublicUrl(data.path);

    const imageUrl = urlData.publicUrl;

    // Upload to Printful
    const printfulResponse = await axios.post(
      `${PRINTFUL_BASE_URL}/files?store_id=${PRINTFUL_STORE_ID}`,
      { url: imageUrl },
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );

    // Generate mockups for each product configuration
    const mockupPromises = productConfigs.map(async (config) => {
      try {
        // Add image URL to files configuration
        config.body.files[0].image_url = imageUrl;

        const response = await axios.post(
          `${PRINTFUL_BASE_URL}/mockup-generator/create-task/${config.product_id}?store_id=${PRINTFUL_STORE_ID}`,
          config.body,
          { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
        );

        return {
          product_id: config.product_id,
          success: true,
          mockupTaskKey: response.data.result.task_key,
          message: `Mockup generated successfully for product ID: ${config.product_id}`
        };
      } catch (error) {
        console.error(`Error generating mockup for product ${config.product_id}:`, error);
        return {
          product_id: config.product_id,
          success: false,
          error: error.message,
          message: `Failed to generate mockup for product ID: ${config.product_id}`
        };
      }
    });

    const mockupResults = await Promise.all(mockupPromises);

    const successfulMockups = mockupResults.filter(result => result.success);
    const failedMockups = mockupResults.filter(result => !result.success);

    return res.status(200).json({
      success: true,
      image_url: imageUrl,
      printful_file_id: printfulResponse.data.result.id,
      results: {
        successful_mockups: successfulMockups,
        failed_mockups: failedMockups,
        total_products: mockupResults.length,
        successful_count: successfulMockups.length,
        failed_count: failedMockups.length
      }
    });

  } catch (error) {
    console.error('Main process error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete mockup generation process',
      details: error.message
    });
  }
};

// Updated waitForMockupCompletion with retry logic

// 3. Get Shipping Rates API
const getShippingRates = async (req, res) => {
  try {
    const { recipient, items } = req.body;

    if (!recipient || !items) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: {
          recipient: !recipient ? 'Missing recipient information' : undefined,
          items: !items ? 'Missing items' : undefined
        }
      });
    }

    const response = await axios.post(
      `${PRINTFUL_BASE_URL}/shipping/rates`,
      { recipient, items },
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );

    return res.status(200).json({
      success: true,
      rates: response.data.result
    });
  } catch (error) {
    console.error('Shipping rates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get shipping rates',
      details: error.response?.data || error.message
    });
  }
};

// 4. Place Order API
const placeOrder = async (req, res) => {
  try {
    const { recipient, items, shipping_option_id } = req.body;

    if (!recipient || !items || !shipping_option_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: {
          recipient: !recipient ? 'Missing recipient information' : undefined,
          items: !items ? 'Missing items' : undefined,
          shipping_option_id: !shipping_option_id ? 'Missing shipping option' : undefined
        }
      });
    }

    const response = await axios.post(
      `${PRINTFUL_BASE_URL}/orders?store_id=${PRINTFUL_STORE_ID}`,
      {
        recipient,
        items,
        shipping: shipping_option_id
      },
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );

    return res.status(200).json({
      success: true,
      order: response.data.result
    });
  } catch (error) {
    console.error('Order placement error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to place order',
      details: error.response?.data || error.message
    });
  }
};

const getMockupResults = async (req, res) => {
  try {
    // Get payload from query params and parse it
    const payload = JSON.parse(req.query.payload);
    console.log('Received payload:', payload);

    if (!payload || !Array.isArray(payload)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload. Expected an array of successful mockups.'
      });
    }

    const mockupResults = await getMockupUrls(payload);

    if (mockupResults && mockupResults.length > 0) {
      return res.status(200).json({
        success: true,
        mockups: mockupResults
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Error occurred when getting mockups"
      });
    }

  } catch (error) {
    console.error('Error getting mockup results:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get mockup results',
      details: error.message
    });
  }
};

const getMockupUrls = async (successfulMockups) => {
  try {
    console.log('Processing mockups:', successfulMockups);
    
    
    const successfulUrls = await Promise.all(
      successfulMockups.map(async (mockup) => ({
        product_id: mockup.product_id,
        mockupUrl: await getMockupUrl(mockup.mockupTaskKey),
        message: mockup.message
      }))
    );

    return successfulUrls;
  } catch (error) {
    console.error('Error processing mockup URLs:', error);
    return null;
  }
};

const getMockupUrl = async (taskKey) => {
  const url = `https://api.printful.com/mockup-generator/task?task_key=${taskKey}&store_id=${PRINTFUL_STORE_ID}`;

  try {
    const headers = {
      'Authorization': `Bearer ${PRINTFUL_API_KEY}`
    };
    
    console.log("Checking mockup status for task:", taskKey);
    let status = 'pending';
    let mockupUrl = null;

    while (status === 'pending') {
      console.log("Checking status...");
      const response = await axios.get(url, { headers });
      
      if (response.status === 200) {
        const result = response.data.result;
        status = result.status;

        if (status === 'completed') {
          mockupUrl = result.mockups[0].mockup_url;
          console.log('Mockup task completed. URL:', mockupUrl);
        } else {
          console.log('Mockup task is still pending, retrying...');
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500ms before retrying
        }
      } else {
        console.error('Error getting mockup task status:', response.data);
        break;
      }
    }

    return mockupUrl;
  } catch (error) {
    console.error('Error while checking mockup task status:', error.message);
    return null;
  }
};

module.exports = {
  getSyncedProducts,
  generateMockups,
  getShippingRates,
  placeOrder,
  getMockupResults
};


