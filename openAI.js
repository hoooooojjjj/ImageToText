require("dotenv").config();
const fs = require("fs");
const OpenAI = require("openai");
const readline = require("readline");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let threadId = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const sendMessage = async (content) => {
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

          console.log(text.value);
          console.log(citations.join("\n"));
        }
      });
    promptUser();
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

const createThread = async () => {
  try {
    const file = await openai.files.create({
      file: fs.createReadStream("./bill.png"),
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

    threadId = thread.id;
    sendMessage("내 전기 요금 고지서를 요약해줘");
  } catch (error) {
    console.error("Error creating thread:", error);
  }
};

const promptUser = () => {
  rl.question("You: ", (input) => {
    sendMessage(input);
  });
};

createThread();
