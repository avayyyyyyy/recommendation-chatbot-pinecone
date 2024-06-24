import { Pinecone } from "@pinecone-database/pinecone";
import { FaqInfoChina, FaqInfoIndia, FaqInfoUSA } from "./FaqInfo";
import OpenAI from "openai";

// Initialize Pinecone and OpenAI clients
const db = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const model = new OpenAI();

// Function to create the Pinecone index
const createIndex = async () => {
  try {
    const index = await db.createIndex({
      name: "recommendation-chatbot",
      dimension: 1536,
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
    console.log("Index created:", index);
  } catch (e) {
    console.log("Index may already exist.");
  }
};

// Define the type and data for embedding
type FaqDataType = {
  faqInfo: string;
  relevancy: number;
  reference: string;
};

const dataToEmbed: FaqDataType[] = [
  { faqInfo: FaqInfoIndia, reference: "India", relevancy: 0.99 },
  { faqInfo: FaqInfoChina, reference: "China", relevancy: 0.77 },
  { faqInfo: FaqInfoUSA, reference: "USA", relevancy: 0.88 },
];

// Function to create embeddings and upsert them into Pinecone
const createEmbeddingAndUpsert = async () => {
  const dbIndex = db.index("recommendation-chatbot");

  await Promise.all(
    dataToEmbed.map(async (data, index) => {
      const embedding = await model.embeddings.create({
        model: "text-embedding-3-small",
        input: data.faqInfo,
      });

      await dbIndex.upsert([
        {
          id: `id-${index}`,
          values: embedding.data[0].embedding,
          metadata: data,
        },
      ]);
    })
  );
  console.log("Data embedded and upserted into Pinecone.");
};

// Function to ask a question and get an answer from OpenAI based on Pinecone data
const askQuestion = async (question: string) => {
  const questionEmbedding = await model.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });

  const quesEmbed = questionEmbedding.data[0].embedding;

  const dbIndex = db.index("recommendation-chatbot");

  const queryResult = await dbIndex.query({
    vector: quesEmbed,
    topK: 1,
    includeMetadata: true,
    includeValues: false,
  });

  const relevantInfo = queryResult.matches[0]?.metadata;
  if (!relevantInfo) {
    console.log("No relevant information found.");
    return;
  }

  const response = await model.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    messages: [
      {
        role: "assistant",
        content: `Answer the question based on the following relevant information: ${JSON.stringify(
          relevantInfo
        )}`,
      },
      { role: "user", content: question },
    ],
  });

  console.log("Answer:", response.choices[0].message.content);
};

// Main execution flow
const main = async () => {
  await createIndex();
  await createEmbeddingAndUpsert();

  console.log("Everything is set up! You can now ask questions.");

  process.stdin.addListener("data", async (data: string) => {
    const input = data.toString().trim();
    await askQuestion(input);
  });
};

main().catch((error) => {
  console.error("An error occurred:", error);
});
