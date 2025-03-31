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
    console.log("hello")
    const response = await axios.get(`${PRINTFUL_BASE_URL}/sync/products?store_id=${PRINTFUL_STORE_ID}`, {
      headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` },
    });
    res.status(200).json(response.data);
    console.log("done");
  } catch (error) {
    console.error('Error fetching synced products:', error.message);
    res.status(500).json({ error: 'Failed to fetch synced products' });
  }
};

// Upload base64 image to Supabase
const uploadImageToSupabase = async (contents, fileName) => {
  try {
    console.log('Starting Supabase upload process...');
    
    // Validate inputs
    if (!contents) throw new Error('Image contents are required');
    if (!fileName) throw new Error('File name is required');

    const mimeType = 'image/png';
    let imageBuffer;

    try {
      // Handle the data URL format
      if (contents.startsWith('data:')) {
        imageBuffer = Buffer.from(contents.split(';base64,')[1], 'base64');
      } else {
        imageBuffer = Buffer.from(contents, 'base64');
      }
    } catch (error) {
      console.error('Base64 conversion error:', error);
      throw new Error('Invalid image contents');
    }

    // Ensure unique filename
    const uniqueFileName = `${Date.now()}-${fileName}`;
    console.log('Uploading file:', uniqueFileName);
    
    const { data, error } = await supabase.storage
      .from('Images')
      .upload(uniqueFileName, imageBuffer, {
        upsert: true,
        contentType: mimeType
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error(`Supabase storage error: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('Images')
      .getPublicUrl(data.path);

    console.log('Successfully uploaded to Supabase:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('uploadImageToSupabase error:', error);
    throw error;
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

// Generate mockups for all available products
const generateMockups = async (req, res) => {
  try {
    console.log('Starting mockup generation process...');
    const { file_name, contents } = req.body;  // Changed from base64, fileName to match your payload

    // Validate request body
    if (!contents || !file_name) {  // Changed validation keys
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: {
          contents: !contents ? 'Missing image contents' : undefined,
          file_name: !file_name ? 'Missing file_name' : undefined
        }
      });
    }

    // Step 1: Upload to Supabase
    let imageUrl;
    try {
      imageUrl = await uploadImageToSupabase(contents, file_name);  // Changed parameters
      console.log('Supabase upload successful:', imageUrl);
    } catch (error) {
      console.error('Supabase upload failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload image to Supabase',
        details: error.message
      });
    }

    // Step 2: Upload to Printful
    let printfulFileId;
    try {
      printfulFileId = await uploadImageToPrintful(imageUrl);
      console.log('Printful upload successful, file ID:', printfulFileId);
    } catch (error) {
      console.error('Printful upload failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload image to Printful',
        details: error.message
      });
    }

    // Step 3: Get synced products
    let syncedProducts;
    try {
      const syncedProductsResponse = await axios.get(
        `${PRINTFUL_BASE_URL}/sync/products?store_id=${PRINTFUL_STORE_ID}`,
        { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
      );
      syncedProducts = syncedProductsResponse.data.result;
      console.log(`Found ${syncedProducts.length} synced products`);
    } catch (error) {
      console.error('Failed to fetch synced products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch synced products',
        details: error.message
      });
    }

    // Step 4: Generate mockups for each product
    const mockupResults = await Promise.allSettled(
      syncedProducts.map(async (product) => {
        try {
          console.log(`Processing product ${product.id}`);
          
          // Get variant details first
          const variantResponse = await axios.get(
            `${PRINTFUL_BASE_URL}/sync/products/${product.id}?store_id=${PRINTFUL_STORE_ID}`,
            { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
          );

          // Default placement based on product type
          let placement = 'front'; // default placement
          
          // Try to determine the best placement based on product type
          const productType = variantResponse.data.result.sync_product.product.type_name;
          if (productType) {
            if (productType.toLowerCase().includes('poster') || 
                productType.toLowerCase().includes('canvas') || 
                productType.toLowerCase().includes('print')) {
              placement = 'default';
            } else if (productType.toLowerCase().includes('mug')) {
              placement = 'front';
            } else if (productType.toLowerCase().includes('phone')) {
              placement = 'default';
            }
          }

          console.log(`Generating mockup for product ${product.id} with placement ${placement}`);
          
          const mockupResponse = await axios.post(
            `${PRINTFUL_BASE_URL}/mockup-generator/create-task/${product.id}?store_id=${PRINTFUL_STORE_ID}`,
            {
              files: [{ 
                placement,
                image_url: imageUrl 
              }]
      },
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } }
    );

          return {
            product_id: product.id,
            product_name: product.name,
            product_type: productType,
            placement,
            mockup_data: mockupResponse.data
          };
        } catch (error) {
          console.error(`Error generating mockup for product ${product.id}:`, error);
          return {
            product_id: product.id,
            error: `Failed: ${error.message}`,
            product_type: error.productType || 'unknown'
          };
        }
      })
    );

    // Process results
    const successful = mockupResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failed = mockupResults
      .filter(result => result.status === 'rejected')
      .map(result => ({
        error: result.reason.message
      }));

    // Send response
    return res.status(200).json({
      success: true,
      message: 'Mockup generation completed',
      image_url: imageUrl,
      printful_file_id: printfulFileId,
      results: {
        successful_mockups: successful,
        failed_mockups: failed,
        total_products: mockupResults.length,
        successful_count: successful.length,
        failed_count: failed.length
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




