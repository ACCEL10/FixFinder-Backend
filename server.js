const express = require('express');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
require('dotenv').config(); // To use environment variables

const upload = multer({ dest: 'uploads/' });
const app = express();

app.use(express.json());

// Configure allowed origins from environment variables (for security)
const allowedOrigins = [process.env.FRONTEND_URL]; // Make sure to add your frontend URL to the environment file

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Use the API key from an environment variable
const apiKey = process.env.GOOGLE_VISION_API_KEY;

app.post("/anotate", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const imagePath = path.join(__dirname, req.file.path);
  let imageBase64;

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    imageBase64 = imageBuffer.toString('base64');
  } catch (err) {
    console.error("Error reading the image file:", err);
    return res.status(500).json({ error: "Error reading the image file" });
  }

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const payload = {
    "requests": [
      {
        "features": [
          { "maxResults": 50, "type": "LANDMARK_DETECTION" },
          { "maxResults": 50, "type": "FACE_DETECTION" },
          { "maxResults": 50, "model": "builtin/latest", "type": "OBJECT_LOCALIZATION" },
          { "maxResults": 50, "model": "builtin/latest", "type": "LOGO_DETECTION" },
          { "maxResults": 50, "type": "LABEL_DETECTION" },
          { "maxResults": 50, "model": "builtin/latest", "type": "DOCUMENT_TEXT_DETECTION" },
          { "maxResults": 50, "type": "SAFE_SEARCH_DETECTION" },
          { "maxResults": 50, "type": "IMAGE_PROPERTIES" },
          { "maxResults": 50, "type": "CROP_HINTS" }
        ],
        "image": {
          "content": imageBase64
        },
        "imageContext": {
          "cropHintsParams": {
            "aspectRatios": [0.8, 1, 1.2]
          }
        }
      }
    ]
  };

  try {
    const response = await axios.post(endpoint, payload);

    if (response.data.error) {
      console.error("Google Vision API error:", response.data.error);
      return res.status(500).json({ error: "Vision API processing failed" });
    }

    // Return the processed data
    res.json(response.data);
  } catch (error) {
    console.error('Error in Vision API request:', error);
    res.status(500).json({ error: 'Error processing image with Vision API' });
  } finally {
    // Clean up the uploaded file after processing
    const deleteFile = promisify(fs.unlink);
    try {
      await deleteFile(imagePath);
    } catch (err) {
      console.error("Error deleting the uploaded file:", err);
    }
  }
});

const port = process.env.PORT || 3001; // Use environment variable for port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});