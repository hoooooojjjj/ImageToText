require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI();

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

      // 고지서 분석이 아니라 그냥 질문하기를 누른 경우에는 답변을 반환하지 않도록 하기

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

module.exports = sendMessage;
