const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');



// Initialize Supabase client with your project's URL and anon/public key
const supabaseUrl = 'https://peflgfeieqtklcpkhszz.supabase.co';  // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZmxnZmVpZXF0a2xjcGtoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMDEzNzksImV4cCI6MjA0Njc3NzM3OX0.OlEbttWuDvHHy9svUAr2quK4IrmRgkGUI0i8Z9LHfrU';  // Replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);


const PRINTFUL_API_KEY = "VLUOC2erat9bErXekeiQ3V2fmQ82vz6Vt3Htjv5o";
const PRINTFUL_STORE_ID = '14805728';
const PRINTFUL_BASE_URL = 'https://api.printful.com';

// Fetch all synced products from Printful
const getSyncedProducts = async (req, res) => {
  try {
    const response = await axios.get(`${PRINTFUL_BASE_URL}/sync/products?store_id=${PRINTFUL_STORE_ID}`, {
      headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` },
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching synced products:', error.message);
    res.status(500).json({ error: 'Failed to fetch synced products' });
  }
};

// Upload base64 image to Supabase
const uploadImageToSupabase = async (base64, fileName) => {
  try {
    const mimeType = 'image/png';
    const imageBlob = Buffer.from(base64.split(',')[1], 'base64');
    
    const { data, error } = await supabase.storage
      .from('Images')
      .upload(fileName, imageBlob, { upsert: true, contentType: mimeType });
    
    if (error) throw new Error('Image upload to Supabase failed');
    
    return supabase.storage.from('Images').getPublicUrl(data.path).data.publicUrl;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Upload image to Printful
const uploadImageToPrintful = async (imageUrl) => {
  try {
    const response = await axios.post(
      `${PRINTFUL_BASE_URL}/files?store_id=${PRINTFUL_STORE_ID}`,
      { url: imageUrl },
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );
    return response.data.result.id;
  } catch (error) {
    console.error('Error uploading image to Printful:', error.message);
    throw new Error('Failed to upload image to Printful');
  }
};

// Generate mockups for products
const generateMockups = async (req, res) => {
  try {
    const { base64, fileName, sync_product_id, placement } = req.body;
    
    // Upload to Supabase
    const imageUrl = await uploadImageToSupabase(base64, fileName);
    
    // Upload to Printful
    const printfulFileId = await uploadImageToPrintful(imageUrl);
    
    // Generate Mockup
    const response = await axios.post(
      `${PRINTFUL_BASE_URL}/mockup-generator/create-task/${sync_product_id}?store_id=${PRINTFUL_STORE_ID}`,
      {
        files: [{ placement, image_url: imageUrl }]
      },
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error generating mockups:', error.message);
    res.status(500).json({ error: 'Failed to generate mockups' });
  }
};

// Get shipping rates
const getShippingRates = async (recipient, items) => {
  try {
    const response = await axios.post(
      `${PRINTFUL_BASE_URL}/shipping/rates`,
      { recipient, items },
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );
    return response.data.result[0].rate;
  } catch (error) {
    console.error('Error fetching shipping rates:', error.message);
    throw new Error('Failed to get shipping rates');
  }
};

// Place an order on Printful
const placeOrder = async (req, res) => {
  try {
    const { recipient, items } = req.body;
    
    // Calculate delivery charge
    const shippingCost = await getShippingRates(recipient, items);
    
    // Create order payload
    const orderData = {
      recipient,
      items,
      shipping: shippingCost,
    };
    
    const response = await axios.post(
      `${PRINTFUL_BASE_URL}/orders?store_id=${PRINTFUL_STORE_ID}`,
      orderData,
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );
    
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error placing order:', error.message);
    res.status(500).json({ error: 'Failed to place order' });
  }
};

module.exports = { getSyncedProducts, generateMockups, placeOrder };




