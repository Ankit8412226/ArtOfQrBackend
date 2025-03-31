const path = require('path');
const { createClient } = require('@supabase/supabase-js');


const supabaseUrl = process.env.SUPABASE_URL || 'https://peflgfeieqtklcpkhszz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZmxnZmVpZXF0a2xjcGtoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMDEzNzksImV4cCI6MjA0Njc3NzM3OX0.OlEbttWuDvHHy9svUAr2quK4IrmRgkGUI0i8Z9LHfrU';
const supabase = createClient(supabaseUrl, supabaseKey);

const VALID_EXTENSIONS = ['.ttf', '.otf'];
const BUCKET_NAME = 'fonts';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const uploadController = async (req, res) => {
  try {
    // Input validation
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files were uploaded'
      });
    }

    const fontFile = req.files.fontFile;

    // Validate file size
    if (fontFile.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 5MB limit'
      });
    }

    // Validate file extension
    const fileExtension = path.extname(fontFile.name).toLowerCase();
    if (!VALID_EXTENSIONS.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Allowed types: ${VALID_EXTENSIONS.join(', ')}`
      });
    }

    // Generate unique filename using timestamp
    const fileName = `user-font-${Date.now()}${fileExtension}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fontFile.data, {
        upsert: true,
        contentType: fontFile.mimetype,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error uploading file to storage'
      });
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // Return success response with file details
    return res.status(200).json({
      success: true,
      message: 'Font uploaded successfully',
      data: {
        fileName,
        fileType: fontFile.mimetype,
        fileSize: fontFile.size,
        publicUrl
      }
    });

  } catch (error) {
    console.error('Upload controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = uploadController;
