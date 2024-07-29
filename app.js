const express = require("express");
const { createThread, sendMessage } = require("./openAI");
const cors = require("cors");
const requestWithFile = require("./clovaOCR");

const app = express();
const port = 8080;
app.use(
  cors({
    origin: ["http://localhost:3000", "https://kkeobi.vercel.app"], // 여러 URL 허용
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.options(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://kkeobi.vercel.app"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

const allowedOrigins = ["http://localhost:3000", "https://kkeobi.vercel.app"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

app.use(express.json());

// 이미지 첨부 이후 대화 스레드 생성 후 첨부된 이미지와 이미지를 텍스트로 추출한 JSON을 담아서 메세지 전송 후 답변 응답
app.post("/chat", async (req, res) => {
  // 사용자가 업로드한 이미지 URL
  const { imageUrl, userInfo } = req.body;

  // 이미지를 JSON으로 추출
  const billImgToJson = await requestWithFile(imageUrl);

  console.log(billImgToJson);
  try {
    // 대화 스레드 생성(이미지와 JSON을 인자로 전달)
    const thread = await createThread(imageUrl, billImgToJson, userInfo);
    // 대화 스레드 생성 후 답변 받기
    const response = await sendMessage("", "", thread, true);

    // 답변이 있을 경우 응답
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

// 사용자가 스레드를 생성한 후 메세지를 보내면 메세지에 대한 답변 응답
app.post("/chat/message", async (req, res) => {
  // 이미지 URL, 메세지 내용, 스레드 ID 받기
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
    // imageUrl, content, threadID를 전달하여 메세지 전송
    const response = await sendMessage(imageUrl, content, threadID);

    // 답변이 있을 경우 응답
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
