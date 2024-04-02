# PharmaBot
PharmaBot is a semantic RAG chatbot that provides drug recommendations based on medical conditions and unwanted side effects. 

## Built with
- Next.js App Router
- Vercel AI SDK
- [SingleStore Database](singlestore.com)
- OpenAI Embedding Model & LLMs

## How it works
- A dataset of common drugs is stored in SingleStore, each record containing
  - medical condition it treats
  - side effects
  - stock availability
  - embedding of the description
- User asks a query to PharmaBot
- The query gets vectorized using OpenAI and is sent to SingleStore
- SingleStore does a matching of the embedding against stored embeddings based on the selected similarity metric (Euclidean distance or dot product)
- SingleStore retrieves top 3 matches, send this context to OpenAI LLM along with a prompt
- OpenAI returns formatted response to user
