import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import * as mysql from 'mysql2/promise';

 
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
 
// Set the runtime to edge for best performance
// export const runtime = 'edge';

async function createConnection() {
    try {
        const singleStoreConnection = await mysql.createConnection({
        host: process.env.S2_HOST,
        user: process.env.S2_USER,
        password: process.env.S2_PASSWORD,
        database: process.env.S2_DATABASE
        });
        console.log("You have successfully connected to SingleStore.");
        return singleStoreConnection;
    } catch (err) { 
        console.error('ERROR', err);
        process.exit(1);
    }
}

function trimTextToTokenLimit(text: string, maxTokens: number = 8000): string | null {
    const trimmedText = text.trim();
    if (!trimmedText) {
        return null;
    }
    const tokens = trimmedText.split(/\s+/);
    if (tokens.length > maxTokens) {
        const trimmedTokens = tokens.slice(0, maxTokens);
        return trimmedTokens.join(" ");
    } else {
        return text;
    }
}

async function getEmbedding(text: string, model: string = "text-embedding-ada-002"): Promise<number[] | null> {
    const trimmedText = await trimTextToTokenLimit(text, 6000);
    if (!trimmedText) return null;
    try {
        const response = await openai.embeddings.create({
            model: model,
            input: [trimmedText],
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error getting embedding:', error);
        return null;
    }
}

async function searchDrug(query: string, similarityMetric: string): Promise<any[]> {
    const connection = await createConnection();

    console.log("Searching for drug matches...");
    const operator = similarityMetric === "dot_product" ? "<*>" : "<->";
    const order = operator === "<*>" ? "DESC" : "ASC";
    const queryEmbeddingVec = await getEmbedding(query);
    const setVectorQuery = `SET @query_vec = '[${queryEmbeddingVec}]' :> VECTOR(1536);`;
    await connection.execute(setVectorQuery);

    const statement = `
        SELECT drug_name, stock, description, medical_condition, side_effects, generic_name, brand_names,
               medical_condition_embedding ${operator} @query_vec AS similarity
        FROM drugs
        WHERE description IS NOT NULL
        ORDER BY similarity ${order}
        LIMIT 3;
    `;

    try {
        const [results] = await connection.execute(statement);
        return results as any[];
    } catch (err) {
        console.log('Error executing search query:', err);
        return [];
    }
}

export async function POST(req: Request) {
    try {
        const {messages, useRag, llm, similarityMetric} = await req.json();
    
        const latestMessage = messages[messages?.length - 1]?.content;
    
        let matchesFormatted = '';
        if (useRag) {
          const matches = await searchDrug(latestMessage, similarityMetric);
          matchesFormatted = matches.map(match => `- ${match.drug_name} for ${match.medical_condition} with ${match.stock} items in stock.`).join("\n");
        }

        console.log("matches are: ", matchesFormatted);

        const prompt = `I am looking for medication options for "${latestMessage}". 
        Given the drugs identified below, which would be the most suitable options and why? 
        If I specified unwanted side effects, consider that as a criteria. Give the product name, brand names, and stock availability.\n${matchesFormatted}\n\n
        Please provide detailed reasons for your recommendations, including side effects and any other relevant criteria. 
        Note: If the answer is not provided in the context, the AI assistant will say, "I'm sorry, I don't know the answer".`;


        const response = await openai.chat.completions.create(
        {
            model: llm ?? 'gpt-3.5-turbo',
            stream: true,
            messages: [
                { role: "system", content: "You are an intelligent assistant trained to provide drug recommendations while considering avoiding unwanted side effects." },
                { role: "user", content: prompt }
            ],
        }
        );
        const stream = OpenAIStream(response);
        return new StreamingTextResponse(stream);
    } catch (e) {
        throw e;
    }
}   