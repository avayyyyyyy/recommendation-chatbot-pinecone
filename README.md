# Recommendation Chatbot

This project is a recommendation chatbot that uses Pinecone for vector indexing and OpenAI for generating embeddings and responses. The chatbot embeds frequently asked questions (FAQs) from different regions (India, China, USA) into a Pinecone index and uses OpenAI to provide relevant answers based on these embeddings.

## Project Structure

- `index.ts`: The main file containing the logic for creating the Pinecone index, embedding data, and querying the index.
- `FaqInfo.ts`: Contains the FAQ information for different regions.

## Prerequisites

1. **Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).
2. **Pinecone API Key**: You need a Pinecone API key. You can get it from [Pinecone](https://www.pinecone.io/).
3. **OpenAI API Key**: You need an OpenAI API key. You can get it from [OpenAI](https://www.openai.com/).

## Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/avayyyyyyy/recommendation-chatbot-pinecone
   cd recommendation-chatbot-pinecone
   ```

2. **Install dependencies**:

   ```sh
   npm install
   ```

3. **Set environment variables**:
   Create a `.env` file in the root directory and add your Pinecone API key:
   ```env
   PINECONE_API_KEY=your_pinecone_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

1. **Run the main script**:

   ```sh
   ts-node index.ts
   ```

2. **Interact with the chatbot**:
   After running the script, you can type your questions in the terminal. The chatbot will respond based on the embedded FAQ information.

## Code Explanation

### Index Creation

The `createIndex` function creates a Pinecone index named "recommendation-chatbot" with a dimension of 1536.

```typescript
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
    console.log("Index may already exist. Error:", e.message);
  }
};
```

### Data Embedding and Upsertion

The `createEmbeddingAndUpsert` function embeds the FAQ data and upserts it into the Pinecone index.

```typescript
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
```

### Asking Questions

The `askQuestion` function takes a user question, embeds it, queries the Pinecone index for the most relevant FAQ, and uses OpenAI to generate a response.

```typescript
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
```

### Main Execution Flow

The `main` function sets up the Pinecone index, embeds the data, and listens for user input.

```typescript
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
```
