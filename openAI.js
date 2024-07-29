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
const createThread = async (imageUrl, billImgToJson, userInfo) => {
  // Fetch the image as a buffer
  const imageBuffer = await fetchImageBuffer(imageUrl);

  //  Convert the image buffer to WebP format
  const webpBuffer = await convertToWebpBuffer(imageBuffer);

  try {
    // Upload the WebP image buffer to OpenAI
    const fileResponse = await uploadImageToOpenAI(webpBuffer);
    const fileId = fileResponse.id;

    // Create a thread with the uploaded image and text
    console.log("userInfo : " + userInfo);
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
              text: `첨부된 이미지는 내 전기 요금 고지서야, 그리고 ${billImgToJson}는 내 전기 요금 고지서 이미지를 텍스트로 변환한 JSON이야. 첨부된 이미지를 JSON을 활용해 읽어보면 첨부된 이미지에 어떤 정보가 있는지 해석하기 편할 거야. JSON의 내용에 대한 설명은 Vector store(id : vs_jCe32ZT0M2MaME8VxYhbDFR0)에 attach되어 있는 billing_re.txt를 참고해줘. 그리고 나의 '사용자 정보(information)'은 다음과 같아. 대가족 요금 생명 유지장치에 관해선 다음 배열의 요소들이 해당돼. 대가족 요금 생명 유지장치 : ${userInfo.family}. 복지할인요금에 관해선 다음 배열의 요소들이 해당돼. 복지할인요금 : ${userInfo.welfare}. 이제 내 전기 요금 고지서에 대해 요약해주고, 내가 또 다른 질문을 이어가면 답변해줘.`,
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
      // 처음 대화 스레드를 생성할 때는 메세지를 보내지 않고 답변만 받음
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

      // 메세지에 대한 답변 반환
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
