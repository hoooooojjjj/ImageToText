const axios = require("axios");
const sharp = require("sharp");
const FormData = require("form-data");
require("dotenv").config();

// 이미지를 URL에서 가져와서 버퍼로 변환하는 함수
const fetchImageBuffer = async (url) => {
  const response = await axios({
    url,
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data, "binary");
};
// 이미지를 PNG 형식으로 변환하는 함수
const convertToPngBuffer = async (buffer) => {
  return sharp(buffer).toFormat("png").toBuffer();
};

// 파일 업로드를 통한 OCR 요청
async function requestWithFile() {
  const imageUrl =
    "https://firebasestorage.googleapis.com/v0/b/kkeobi-f29da.appspot.com/o/billImg%2FdzrCBVc2erQFOlZnoEOSACPikxy1%2F%E1%84%8C%E1%85%A5%E1%86%AB%E1%84%80%E1%85%B5%E1%84%8B%E1%85%AD%E1%84%80%E1%85%B3%E1%86%B7%20%E1%84%80%E1%85%A9%E1%84%8C%E1%85%B5%E1%84%89%E1%85%A5%20%E1%84%90%E1%85%A6%E1%86%B7%E1%84%91%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%BA.png?alt=media&token=79f767c0-0b86-4fed-b652-c706c4fc2c1e";

  try {
    // Step 1: Fetch the image as a buffer
    const imageBuffer = await fetchImageBuffer(imageUrl);

    // Step 2: Convert the image buffer to PNG format
    const pngBuffer = await convertToPngBuffer(imageBuffer);

    // API 요청 메시지 생성
    const message = {
      images: [
        {
          format: "png", // 파일 포맷
          name: "elec_bill", // 파일 이름
        },
      ],
      requestId: "unique-request-id", // 유니크한 문자열
      timestamp: Date.now(),
      version: "V2",
      enableTableDetection: true,
    };

    // FormData를 사용하여 이미지와 메시지를 업로드
    const formData = new FormData();
    formData.append("file", pngBuffer, { filename: "image.png" });
    formData.append("message", JSON.stringify(message));

    // OCR API에 요청 전송
    const res = await axios.post(
      process.env.CLOVA_INVOKE_URL, // APIGW Invoke URL
      formData,
      {
        headers: {
          "X-OCR-SECRET": process.env.CLOVA_API_KEY, // Secret Key
          ...formData.getHeaders(),
        },
      }
    );

    // 응답 처리
    if (res.status === 200) {
      console.log(
        "requestWithFile response:",
        res.data.images[0].fields
        // res.data.images[0].tables[0].cells
      );
    }
  } catch (error) {
    console.warn("requestWithFile error", error.response);
  }
}

requestWithFile();
