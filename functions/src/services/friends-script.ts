import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Pinecone 클라이언트 초기화
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});
const pineconeIndex = pc.index("refit");

export interface SearchResult {
  text: string;
  score: number;
}

export interface ScriptResult {
  script: string;
  similarity: number;
}

/**
 * Friends Script 서비스
 */
export class FriendsScriptService {
  /**
   * 검색 쿼리 생성
   */
  async generateSearchQuery(userInput: string): Promise<string> {
    const prompt = `
You are an assistant helping an English learner search for example sentences in a spoken dialogue database.

The learner typed:  "${userInput}"

Please generate a **concise search query** that focuses on the **key English expression or grammar pattern** they are trying to practice (e.g. "I wish", "It turns out", "I should have", etc.).

✅ Focus ONLY on reusable English expressions, grammar phrases, or sentence structures.
❌ Do NOT use specific nouns (e.g. "doctor", "coffee", "car") as the main focus of the search query.
✅ Your query should work even if the topic or noun is changed.

Return only the clean search query (1 sentence or phrase). No explanations.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0].message.content?.trim() || userInput;
    } catch (error) {
      console.error("Search query generation error:", error);
      return userInput;
    }
  }

  /**
   * Pinecone 벡터 검색
   */
  async searchInPinecone(queryText: string, topK = 3): Promise<SearchResult[]> {
    try {
      // 1. OpenAI 임베딩 생성
      const embeddingResponse = await openai.embeddings.create({
        input: [queryText],
        model: "text-embedding-3-small",
      });

      const embedding = embeddingResponse.data[0].embedding;

      // 2. Pinecone에서 벡터 검색
      const queryResponse = await pineconeIndex.query({
        vector: embedding,
        topK: topK,
        includeMetadata: true,
      });

      console.log(`Pinecone query for "${queryText}":`, {
        matchCount: queryResponse.matches?.length || 0,
        matches: queryResponse.matches?.slice(0, 2).map((m) => ({
          text: m.metadata?.text,
          score: m.score,
        })),
      });

      // 3. 결과 포맷팅
      const results: SearchResult[] = [];
      for (const match of queryResponse.matches || []) {
        if (match.metadata && match.metadata.text) {
          results.push({
            text: match.metadata.text as string,
            score: match.score || 0,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Pinecone search error:", error);
      return [];
    }
  }

  /**
   * 유사한 스크립트 찾기
   */
  async findSimilarScript(userInput: string): Promise<ScriptResult> {
    try {
      // 1. 검색 쿼리 생성
      const searchQuery = await this.generateSearchQuery(userInput);

      // 2. Pinecone에서 검색
      const searchResults = await this.searchInPinecone(searchQuery, 1);

      if (searchResults.length === 0) {
        return {
          script:
            "I understand what you're saying. Let's continue the conversation!",
          similarity: 0,
        };
      }

      const bestMatch = searchResults[0];

      return {
        script: bestMatch.text,
        similarity: bestMatch.score,
      };
    } catch (error) {
      console.error("Find similar script error:", error);
      return {
        script:
          "I understand what you're saying. Let's continue the conversation!",
        similarity: 0,
      };
    }
  }

  /**
   * 사용자 입력에 대한 응답 생성
   */
  async generateResponse(userInput: string): Promise<string> {
    try {
      const scriptResult = await this.findSimilarScript(userInput);

      // 유사도가 높은 경우 스크립트를 응답으로 사용
      if (scriptResult.similarity > 0.7) {
        return `Here's a similar expression from Friends: "${scriptResult.script}"`;
      }

      // 유사도가 낮은 경우 일반적인 응답
      return "That's a great way to express yourself! Keep practicing your English conversation skills.";
    } catch (error) {
      console.error("Generate response error:", error);
      return "I understand what you're saying. Let's continue the conversation!";
    }
  }
}
