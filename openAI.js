const fs = require("fs");
const OpenAI = require("openai");
const openai = new OpenAI();

const createThread = async () => {
  const file = await openai.files.create({
    file: fs.createReadStream("./전기 고지서.png"),
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

  const stream = openai.beta.threads.runs
    .stream(thread.id, {
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
};

createThread();
