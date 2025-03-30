const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with your project's URL and anon/public key
const supabaseUrl = 'https://peflgfeieqtklcpkhszz.supabase.co';  // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZmxnZmVpZXF0a2xjcGtoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMDEzNzksImV4cCI6MjA0Njc3NzM3OX0.OlEbttWuDvHHy9svUAr2quK4IrmRgkGUI0i8Z9LHfrU';  // Replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bmxueHFxY3l1eGF1eHZ4Y2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4MDA4MTQsImV4cCI6MjA0MzM3NjgxNH0.0hzVuAKkvFRzNo1O4WzDw1wQTCxONIxIZTsg5t1oVac
const uploadController = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    const fontFile = req.files.fontFile;
    const fileExtension = path.extname(fontFile.name);
    const validExtensions = ['.ttf', '.otf'];  // Valid font extensions

    if (!validExtensions.includes(fileExtension)) {
      return res.status(400).send('Invalid font file type.');
    }

    const fileName = `user-font${fileExtension}`;
    const bucketName = 'fonts';  // Replace with your Supabase bucket name
    console.log("hi i am here ")
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fontFile.data, {
        upsert: true,  // If the file already exists, replace it
        contentType: fontFile.mimetype,  // Ensure the correct content type is set
      });

    if (error) {
      console.error('Error uploading file to Supabase:', error.message);
      return res.status(500).send('Error uploading file.');
    }
    

    // Return success message or download URL
    res.send('Font uploaded and replaced successfully.');
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).send('Error uploading file.');
  }
};

module.exports = uploadController;
