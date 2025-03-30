const path = require("path");
const axios = require('axios')

let ACCESS_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjA0ZjY5MjVhM2E4MDUyYjk1MjBjNzBmNDBlNDY5NTQxZjFiMmJiNDY0YWZjNTVlYThjYzA1ZTAwZTI0NmIwMjk1NDAxMTUxNzgwNDZhNzExIiwiaWF0IjoxNzI3NDYxNjk4LjUwMjczOSwibmJmIjoxNzI3NDYxNjk4LjUwMjc0MiwiZXhwIjoxNzU4OTk3Njk4LjQ5NjI3NSwic3ViIjoiMTk5ODg1OTgiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.AtN5V7sugdIrbrFJQkL5EhLiatBiMdEn6tGfn7nVaCxs254S3wtCKwv8Ebvgu1xXND8ExfDkUuWamgmL3NU";

const uploadPrintifyController = async (req, res) => {
  try {
    console.log('Req:........... ',req)
    const response = await axios.post(
      "https://api.printify.com/v1/uploads/images.json",
      req.body,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error("Image upload error:", err);
    return res.status(500).send("Error uploading image.");
  }
};

module.exports = uploadPrintifyController;
