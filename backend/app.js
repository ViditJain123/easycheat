const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const T = require("tesseract.js");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();

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
    fileSize: 10 * 1024 * 1024, 
  },
});

app.use("/profile", express.static("upload/images"));

app.post("/upload", upload.single("profile"), async (req, res, next) => {
  const tempPath = path.join("./upload/images", req.file.filename);

  try {
    const { data: { text } } = await T.recognize(tempPath, "eng");
    console.log("Extracted Text:", text);

    const result = await model.generateContent(text);
    const response = result.response.text;
    const answer = response();

    console.log("Generated Answer:", answer);

    res.json({
      success: 1,
      profile_url: `http://localhost:4000/profile/${req.file.filename}`,
      extracted_text: text, 
      answer: answer,       
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

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