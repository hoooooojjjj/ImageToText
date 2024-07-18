const express = require("express");

const app = express();
const port = 8080;

app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { imageUrl, text } = req.body;
  if (!imageUrl || !text) {
    return res.status(400).json({ error: "Image URL and text are required." });
  }
  console.log(imageUrl, text);
});

// 서버 실행
app.listen(8080, () => {
  console.log("서버 실행 중");
});
