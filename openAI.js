require("dotenv").config();
const fs = require("fs");
const OpenAI = require("openai");
const readline = require("readline");

const openai = new OpenAI();

const sendMessage = async (imageUrl, content, threadId) => {
  let answer;
  let answerCitations;
  let err;

  try {
    const response = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: [
        {
          type: "text",
          text: content,
        },
      ],
    });

    const stream = openai.beta.threads.runs
      .stream(threadId, {
        assistant_id: "asst_tNqwuLVWp7WJ3S69BVSPn1P9",
      })
      .on("textCreated", () => console.log("assistant >"))
      .on("toolCallCreated", (event) => console.log("assistant " + event.type))
      .on("messageDone", async (event) => {
        if (event.content[0].type === "text") {
          const { text } = event.content[0];
          const { annotations } = text;
          const citations = [];

          let index = 0;
          for (let annotation of annotations) {
            text.value = text.value.replace(annotation.text, "[" + index + "]");
            const { file_citation } = annotation;
            if (file_citation) {
              const citedFile = await openai.files.retrieve(
                file_citation.file_id
              );
              citations.push("[" + index + "]" + citedFile.filename);
            }
            index++;
          }

          answer = text.value;
          answerCitations = citations.join("\n");
        }
      });
  } catch (error) {
    err = error;
  }

  return { answer, answerCitations, err };
};

const createThread = async (imageUrl) => {
  try {
    const file = await openai.files.create({
      file: fs.createReadStream(imageUrl),
      purpose: "assistants",
    });

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_file",
              image_file: {
                file_id: file.id,
              },
            },
            {
              type: "text",
              text: "내 전기 요금 고지서야",
            },
          ],
        },
      ],
    });

    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
  }
};

module.exports = {
  createThread,
  sendMessage,
};
