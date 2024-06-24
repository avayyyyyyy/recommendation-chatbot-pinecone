import { Pinecone } from "@pinecone-database/pinecone";

const db = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const createIndex = async () => {
  const index = await db.createIndex({
    name: "recommendation-chatbot",
    dimension: 405,
    spec: {
      serverless: {
        cloud: "aws",
        region: "us-east-1",
      },
    },
  });

  console.log(index);
};

createIndex();
