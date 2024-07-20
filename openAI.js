require("dotenv").config();
const OpenAI = require("openai");
const sharp = require("sharp");
const axios = require("axios");
const FormData = require("form-data");
const openai = new OpenAI();

// 함수는 주어진 URL에서 이미지를 다운로드하여 메모리 버퍼로 반환
const fetchImageBuffer = async (url) => {
  const response = await axios({
    url,
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data, "binary");
};

// 함수는 이미지 버퍼를 webp 형식의 버퍼로 변환
const convertToWebpBuffer = async (buffer) => {
  return sharp(buffer).toFormat("webp").toBuffer();
};

// 함수는 form-data를 사용하여 이미지를 버퍼에서 OpenAI API로 업로드
const uploadImageToOpenAI = async (buffer) => {
  const form = new FormData();
  console.log("buffer", buffer);
  form.append("file", buffer, { filename: "image.webp" });
  form.append("purpose", "assistants");

  const response = await axios.post("https://api.openai.com/v1/files", form, {
    headers: {
      ...form.getHeaders(),

      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  });

  return response.data;
};

// assistants 대화 Thread 생성
const createThread = async (imageUrl) => {
  // Fetch the image as a buffer
  const imageBuffer = await fetchImageBuffer(imageUrl);

  //  Convert the image buffer to WebP format
  const webpBuffer = await convertToWebpBuffer(imageBuffer);

  try {
    // Upload the WebP image buffer to OpenAI
    const fileResponse = await uploadImageToOpenAI(webpBuffer);
    const fileId = fileResponse.id;

    // Create a thread with the uploaded image and text
    const threadResponse = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_file",
              image_file: {
                file_id: fileId,
              },
            },
            {
              type: "text",
              text: "내 전기 요금 고지서야, 이 고지서를 분석해줘.",
            },
          ],
        },
      ],
    });

    return threadResponse.id;
  } catch (error) {
    console.error("Error creating thread:", error);
  }
};

// assistants에 메세지 보내고 응답 받는 함수
const sendMessage = async (imageUrl, content, threadId, isCreateThread) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isCreateThread) {
        const response = await openai.beta.threads.messages.create(threadId, {
          role: "user",
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        });
      }

      const stream = openai.beta.threads.runs
        .stream(threadId, {
          assistant_id: "asst_tNqwuLVWp7WJ3S69BVSPn1P9",
        })
        .on("messageDone", async (event) => {
          if (event.content[0].type === "text") {
            const { text } = event.content[0];
            const { annotations } = text;
            const citations = [];

            let index = 0;
            for (let annotation of annotations) {
              text.value = text.value.replace(
                annotation.text,
                "[" + index + "]"
              );
              const { file_citation } = annotation;
              if (file_citation) {
                const citedFile = await openai.files.retrieve(
                  file_citation.file_id
                );
                citations.push("[" + index + "]" + citedFile.filename);
              }
              index++;
            }
            resolve({
              answer: text.value,
              answerCitations: citations.join("\n"),
              err: null,
            });
          }
        });
    } catch (error) {
      reject({ answer: null, answerCitations: null, err: error });
    }
  });
};

module.exports = {
  createThread,
  sendMessage,
};
