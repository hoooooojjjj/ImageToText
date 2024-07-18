const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// 파일 업로드를 통한 OCR 요청
function requestWithFile() {
  // 사용자가 업로드한 이미지 파일
  const file = fs.createReadStream("./bill.png"); // image file object
  const format = file.path.split(".").pop();
  const name = file.path.split("/").pop().split(".")[0];
  // API 요청 메시지
  const message = {
    images: [
      {
        format: format, // file format
        name: name, // file name
      },
    ],
    requestId: "unique-request-ids", // unique string
    timestamp: Date.now(),
    version: "V2",
    enableTableDetection: true,
  };
  const formData = new FormData();

  formData.append("file", file);
  formData.append("message", JSON.stringify(message));

  axios
    .post(
      "https://f3tr2z5492.apigw.ntruss.com/custom/v1/32732/9ee42e9e63bc893769de5d204ea12159275af9564e7fee566513650c1126856f/general", // APIGW Invoke URL
      formData,
      {
        headers: {
          "X-OCR-SECRET": process.env.CLOVA_API_KEY, // Secret Key
          ...formData.getHeaders(),
        },
      }
    )
    .then((res) => {
      if (res.status === 200) {
        console.log(
          "requestWithFile response:",
          res.data
          // res.data.images[0].tables[0].cells
        );
      }
    })
    .catch((e) => {
      console.warn("requestWithFile error", e.response);
    });
}

requestWithFile();
