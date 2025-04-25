const { createClient } = require('@supabase/supabase-js');


const supabaseUrl = process.env.SUPABASE_URL || 'https://peflgfeieqtklcpkhszz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZmxnZmVpZXF0a2xjcGtoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMDEzNzksImV4cCI6MjA0Njc3NzM3OX0.OlEbttWuDvHHy9svUAr2quK4IrmRgkGUI0i8Z9LHfrU';
const supabase = createClient(supabaseUrl, supabaseKey);

const submitContactForm = async (req, res) => {
    const { name, email, subject, message } = req.body;
  
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields: {
          name: !name,
          email: !email,
          message: !message
        }
      });
    }
  
    try {
      // Insert contact form submission into Supabase
      const { data, error } = await supabase
        .from('contact_submissions')
        .insert([{ 
          name, 
          email, 
          subject, 
          message,
          submitted_at: new Date()
        }]);
  
      if (error) {
        console.error('Contact Form Submission Error:', error);
        return res.status(500).json({ error: 'Failed to submit contact form' });
      }
  
      return res.status(200).json({ 
        success: true, 
        message: 'Your message has been sent successfully!' 
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  };
  
  /**
   * Get all contact form submissions (admin access)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  const getAllContactSubmissions = async (req, res) => {
    // Verify authentication/authorization (implement your auth check)
    // This is a placeholder - you should implement proper authentication
    const isAuthorized = req.headers.authorization === process.env.ADMIN_API_KEY;
    
    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
  
      if (error) {
        console.error('Fetch Error:', error);
        return res.status(500).json({ error: 'Failed to fetch contact submissions' });
      }
  
      return res.status(200).json({ submissions: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  };
  
  module.exports = {
    submitContactForm,
    getAllContactSubmissions
  };