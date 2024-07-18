const express = require("express");
const { createThread, sendMessage } = require("./openAI");

const app = express();
const port = 8080;

app.use(express.json());

app.post("/chat", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl is required." });
  }
  try {
    const thread = await createThread(imageUrl);

    console.log(thread);
    res.json({ message: "Thread created successfully.", thread });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create thread." });
  }
});

app.post("/chat/message", async (req, res) => {
  const { imageUrl, content, threadID } = req.body;
  if (!content) {
    return res.status(400).json({ error: "text is required." });
  }
  if (!threadID) {
    return res
      .status(400)
      .json({ error: "No thread available. Create a thread first." });
  }
  try {
    const response = await sendMessage(imageUrl, content, threadID);
    console.log(response);
    res.json({ message: "Message sent successfully.", response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send message." });
  }
});

// 서버 실행
app.listen(port, () => {
  console.log("서버 실행 중");
});
