const express = require("express");
const { createThread, sendMessage } = require("./openAI");
const cors = require("cors");

const app = express();
const port = 8080;
app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { imageUrl } = req.body;

  try {
    const thread = await createThread(imageUrl);
    const response = await sendMessage("", "", thread, true);
    console.log(response);
    if (response) {
      res.json({
        message: "Thread created and Message sent successfully.",
        thread,
        response,
      });
    } else {
      res.status(503).json({ error: "ai does'nt send message." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create thread." });
  }
});

app.post("/chat/message", async (req, res) => {
  const { imageUrl, content, threadID } = req.body;
  if (!content) {
    return res.status(400).json({ error: "content is required." });
  }
  if (!threadID) {
    return res
      .status(400)
      .json({ error: "No thread available. Create a thread first." });
  }
  try {
    const response = await sendMessage(imageUrl, content, threadID);
    console.log(response);
    if (response) {
      res.json({ message: "Message sent successfully.", response });
    } else {
      res.status(503).json({ error: "ai does'nt send message." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send message." });
  }
});

// 서버 실행
app.listen(port, () => {
  console.log("서버 실행 중");
});
