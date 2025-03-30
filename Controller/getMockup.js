const axios = require('axios');

// printful api key
const apiKey = 'VLUOC2erat9bErXekeiQ3V2fmQ82vz6Vt3Htjv5o';


/*sucessful mockup [
  {
    product_id: 223,
    success: true,
    mockupTaskKey: 'gt-723458374',
    message: 'Mockup generated successfully for product ID: 223'
  },
  {
    product_id: 206,
    success: true,
    mockupTaskKey: 'gt-723458373',
    message: 'Mockup generated successfully for product ID: 206'
  }
]*/

const getCreatedMockupsUrl=async(req,res)=>{
    const payload = JSON.parse(req.query.payload);
    console.log(payload);
    const response= await callingApi(payload);
    if(response)
        res.status(200).json(response);
    else
        res.status(500).json({message:"Error occured when getting mockup"})
}

const callingApi=async(successfulMockups)=>{
    console.log(successfulMockups);
      // Map and retrieve URLs for successful mockups
      const successfulUrls = await Promise.all(
        successfulMockups.map(async (response) => ({
          product_id: response.product_id,
          mockupUrl: await getMockupUrl(response.mockupTaskKey),
          message: response.message,
        }))
      );
      return successfulUrls;
}

async function getMockupUrl(taskKey) {
    const url = `https://api.printful.com/mockup-generator/task?task_key=${taskKey}&store_id=14805728`;
  
    try {
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
      };
      console.log("hi i am in try block");
      let status = 'pending';
      let mockupUrl = null;
  
  
  
      while (status === 'pending') {
        console.log("hi i am in while loop");
        const response = await axios.get(url, { headers });
        if (response.status === 200) {
  
          const result = response.data.result;
          status = result.status;
  
          if (status === 'completed') {
            mockupUrl = result.mockups[0].mockup_url;
            console.log('Mockup task completed. URL:', mockupUrl);
          } else {
            console.log('Mockup task is still pending, retrying...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 5 seconds before retrying
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
  }
module.exports=getCreatedMockupsUrl;