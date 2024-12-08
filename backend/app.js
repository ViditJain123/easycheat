const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();

const app = express();

// OpenAI API Initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    // Read the image file and convert it to base64
    const imageBuffer = fs.readFileSync(tempPath);
    const base64Image = imageBuffer.toString("base64");

    // Instruction prompt for the model
    const instruction =
      "You are an expert in chemistry. I will give an question in image which you have to solve. Give response.";
    const inputText = `${instruction}`;

    // Generate content using GPT model
    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "You are an expert in chemistry. I will give an question in image which you have to solve. Give response.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64, ${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 10000,
    });

    const answer = response.choices[0].message.content.trim();
    console.log("Generated Answer:", answer);

    // Send the Base64 image and answer in the response
    res.json({
      success: 1,
      profile_url: `http://localhost:4000/profile/${req.file.filename}`,
      base64_image: base64Image,
      answer: answer,
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
