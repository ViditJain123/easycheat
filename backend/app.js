const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const T = require("tesseract.js");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();

const app = express();
  
// OpenAI API Initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Fetch the API key from .env
});

// Storage engine configuration
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB file size
  },
});

app.use("/profile", express.static("upload/images"));

// Route for file upload
app.post("/upload", upload.single("profile"), async (req, res, next) => {
  const tempPath = path.join("./upload/images", req.file.filename);

  try {
    // Perform OCR on the uploaded file
    const { data: { text } } = await T.recognize(tempPath, "eng");
    console.log("Extracted Text:", text);
    const instruction = "You are an expert in electrical machines. I will give you question to solve and you have to give just the final answer. I dont want all of the calculations that you do. I want final answer till 4 decimals. So please give me just the final answer. By that I mean if the final answer is 9.6565 your response should be just that. I dont want to have all the calculations in the response";
    const inputText = `${instruction} ${text}`;
    // Generate content using GPT-4 model
    const response = await openai.chat.completions.create({
      
      model: "o1-preview",
      messages: [
        { role: "user", content: inputText },
      ],
    });

    const answer = response.choices[0].message.content.trim();
    console.log("Generated Answer:", answer);

    // Send the extracted text and answer in the response
    res.json({
      success: 1,
      profile_url: `http://localhost:4000/profile/${req.file.filename}`,
      extracted_text: text, // Include extracted text in the response
      answer: answer,       // Include the generated answer in the response
    });
  } catch (err) {
    console.error(err);
    next(err); // Pass the error to the error handler
  }
});

// Error handler middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: 0,
      message: err.message,
    });
  } else {
    res.status(500).json({
      success: 0,
      message: "Internal Server Error",
    });
  }
});

app.listen(4000, () => {
  console.log("Server up and running on port 4000");
});
