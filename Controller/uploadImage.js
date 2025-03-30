const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// printful api key
const apiKey = 'VLUOC2erat9bErXekeiQ3V2fmQ82vz6Vt3Htjv5o';

// Initialize Supabase client with your project's URL and anon/public key
const supabaseUrl = 'https://peflgfeieqtklcpkhszz.supabase.co';  // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZmxnZmVpZXF0a2xjcGtoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMDEzNzksImV4cCI6MjA0Njc3NzM3OX0.OlEbttWuDvHHy9svUAr2quK4IrmRgkGUI0i8Z9LHfrU';  // Replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Node.js-compatible base64 to Blob conversion
function base64ToBlob(base64, mime) {
  const byteString = Buffer.from(base64.split(',')[1], 'base64');  // Decode using Buffer
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString[i];
  }
  return new Blob([ab], { type: mime });
}

// Get public URL of image from Supabase storage
function getImageUrl(path) {

  const sanitizedPath = path.replace(/\s/g, '').replace(/\n/g, '');
  console.log("path:", path);
  const { data, error } = supabase.storage
    .from('Images')
    .getPublicUrl(sanitizedPath);

  if (error) {
    console.error("Error getting public URL:", error.message);
    return null; // Return null in case of error
  }
  console.log("supabase url:", data);
  return data.publicUrl;
}

// Upload base64 image to Supabase and then to Printful
async function uploadBase64ImageController(req, res) {
  try {
    const mimeType = "image/png"; // Adjust according to the image type
    const imageBlob = base64ToBlob(req.body.contents, mimeType);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('Images')  // Replace with your actual bucket name
      .upload(req.body.file_name, imageBlob, {
        upsert: true,
        contentType: mimeType
      });

    if (error) {
      console.error("Error uploading image to Supabase:", error.message);
      return res.status(500).json({ error: "Image upload failed" });
    }

    // Get public URL of the uploaded image
    const publicUrl = getImageUrl(data.path);
    if (!publicUrl) {
      return res.status(500).json({ error: "Failed to get public image URL" });
    }

    // Upload image to Printful
    const printfulResponse = await uploadImageToPrintful(publicUrl);

    if (printfulResponse.error) {
      return res.status(500).json({ error: "Failed to upload image to Printful" });
    }
    const payload = [
      {
        product_id: 223,
        body: {
          "variant_ids": [
            8024,
            8025,
            8026,
            8027,
            8028
          ],
          "printfile_id": 1,
          "format": "jpg",
          "width": 0,
          "product_options": {},
          "files": [
            {
              "placement": "front",
              "image_url": publicUrl,
              "position": {
                "area_width": 1800,
                "area_height": 2400,
                "width": 1200,
                "height": 1600,
                "top": 0,
                "left": 300
              }
            }
          ]
        }
      },
      {
        product_id: 206,
        body: {
          "variant_ids": [
            
            7853,
            
          ],
          "printfile_id": 75,
          "format": "jpg",
          "width": 0,
          "product_options": {},
          "files": [
            {
              "placement": "embroidery_front_large",
              "image_url": publicUrl,
              "position": {
                "area_width": 1650,
                "area_height": 600,
                "width": 825,
                "height": 600,
                "top": 0,
                "left": 412
              }
            }
          ]
        }
      }
    ]




    const mockupResponses = await Promise.all(
      payload.map(async (item) => {
        const mockupTaskKey = await createMockupTask(item, publicUrl);
        return {
          "product_id": item.product_id,
          "success": !!mockupTaskKey,
          mockupTaskKey,
          message: mockupTaskKey
            ? `Mockup generated successfully for product ID: ${item.product_id}`
            : `Failed to generate mockup for product ID: ${item.product_id}`,
        };
      })
    );
    // Filter successful and failed mockup tasks
    const successfulMockups = mockupResponses.filter(response => response.success);
    const failedMockups = mockupResponses.filter(response => !response.success);

    // Check if all tasks failed
    if (successfulMockups.length === 0) {
      return res.status(207).json({
        error: "Failed to generate mockup",
        message: "Image uploaded successfully!",
        details: failedMockups,
        printfulResponse
      });
    }
    
      return res.status(200).json({ message: "Image uploaded successfully", printfulResponse, successfulMockups });
  } catch (err) {
    console.error("Error during the image upload process:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// Function to upload image to Printful
async function uploadImageToPrintful(imageUrl) {
  const url = 'https://api.printful.com/files?store_id=14805728'; // Printful API endpoint for file uploads

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const body = {
      url: imageUrl, // Use the Supabase image URL
    };

    const response = await axios.post(url, body, { headers });

    if (response.status === 200) {
      console.log('Image uploaded to Printful successfully');
      return response.data; // Return the response data
    } else {
      console.error('Error uploading image to Printful:', response.data);
      return { error: 'Failed to upload image to Printful' };
    }
  } catch (error) {
    console.error('Error during Printful image upload:', error.message);
    return { error: 'Printful upload error' };
  }
}






async function createMockupTask(data, publicUrl) {
  data.body.imageUrl = publicUrl;
  const url = `https://api.printful.com/mockup-generator/create-task/${data.product_id}?store_id=14805728`;

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };



    const response = await axios.post(url, data.body, { headers });
    console.log(response.data.result);

    if (response.status === 200) {
      console.log('Mockup task created successfully');
      return response.data.result.task_key; // Return the task key
    } else {
      console.error('Error creating mockup task:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error during mockup task creation:', error.message);
    return null;
  }
}




module.exports = uploadBase64ImageController;
