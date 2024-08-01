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

// 고지서 분석 -> assistants 대화 Thread 생성
const createThreadWithImg = async (
  imageUrl,
  billImgToJson,
  userInfo,
  ChatNavigation
) => {
  let billIs;
  switch (ChatNavigation) {
    case "electricity":
      billIs = "전기 요금 고지서";
      break;
    case "gas":
      billIs = "가스 요금 고지서";
      break;
    case "water":
      billIs = "수도 요금 고지서";
      break;
  }

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
              text: `첨부된 이미지는 내 ${billIs}야, 그리고 ${billImgToJson}는 내 ${billIs} 이미지를 텍스트로 변환한 JSON이야. 첨부된 이미지를 JSON을 활용해 읽어보면 첨부된 이미지에 어떤 정보가 있는지 해석하기 편할 거야. JSON의 내용에 대한 설명은 Vector store(id : vs_jCe32ZT0M2MaME8VxYhbDFR0)에 attach되어 있는 billing_re.txt를 참고해줘. 그리고 나의 '사용자 정보(information)'은 다음과 같아. 대가족 요금 생명 유지장치에 관해선 다음 배열의 요소들이 해당돼. 대가족 요금 생명 유지장치 : ${userInfo?.family}. 복지할인요금에 관해선 다음 배열의 요소들이 해당돼. 복지할인요금 : ${userInfo?.welfare}. 이제 내 ${billIs}에 대해 요약해주고, 내가 또 다른 질문을 이어가면 답변해줘.`,
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

// 질문하기 -> assistants 대화 Thread 생성
const createThreadNoImg = async (userInfo, ChatNavigation) => {
  let billIs;
  switch (ChatNavigation) {
    case "electricity":
      billIs = "전기 요금 고지서";
      break;
    case "gas":
      billIs = "가스 요금 고지서";
      break;
    case "water":
      billIs = "수도 요금 고지서";
      break;
  }

  try {
    // Create a thread with text
    const threadResponse = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `내가 ${billIs}에 대해 물어볼거니까 잘 대답해줘. 그리고 나의 '사용자 정보(information)'은 다음과 같아. 대가족 요금 생명 유지장치에 관해선 다음 배열의 요소들이 해당돼. 대가족 요금 생명 유지장치 : ${userInfo?.family}. 복지할인요금에 관해선 다음 배열의 요소들이 해당돼. 복지할인요금 : ${userInfo?.welfare}. 이제 내가 질문하면 잘 대답해주고, 내가 또 다른 질문을 이어가면 답변해줘.`,
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

module.exports = { createThreadWithImg, createThreadNoImg };
