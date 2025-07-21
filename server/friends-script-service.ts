import OpenAI from "openai";
import { Expression } from "../shared/schema.js";
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Pinecone 클라이언트 초기화 (Python 코드와 동일)
const pc = new Pinecone({ 
  apiKey: process.env.PINECONE_API_KEY || ''
});
const pineconeIndex = pc.index("refit");

export interface SearchResult {
  text: string;
  score: number;
}

export interface PracticeRound {
  searchQuery: string;
  targetSentence: string;
  dialogueScript: string;
  isCorrect?: boolean;
  feedback?: string;
}

/**
 * Python 코드를 그대로 구현한 Friends Script 서비스
 */
export class FriendsScriptService {

  /**
   * Python의 generate_search_query 함수 구현
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
        messages: [{"role": "user", "content": prompt}]
      });
      
      return response.choices[0].message.content?.trim() || userInput;
    } catch (error) {
      console.error('Search query generation error:', error);
      return userInput;
    }
  }

  /**
   * Python의 search_in_pinecone 함수 구현 - 실제 Pinecone 벡터 검색
   */
  async searchInPinecone(queryText: string, topK = 3): Promise<SearchResult[]> {
    try {
      // 1. OpenAI 임베딩 생성 (Python 코드와 동일)
      const embeddingResponse = await openai.embeddings.create({
        input: [queryText],
        model: "text-embedding-3-small"
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // 2. Pinecone에서 벡터 검색 (Python 코드와 동일)
      const queryResponse = await pineconeIndex.query({
        vector: embedding,
        topK: topK,
        includeMetadata: true
      });
      
      console.log(`Pinecone query for "${queryText}":`, {
        matchCount: queryResponse.matches?.length || 0,
        matches: queryResponse.matches?.slice(0, 2).map(m => ({
          text: m.metadata?.text,
          score: m.score
        }))
      });
      
      // 3. 결과 포맷팅 (Python 코드와 동일)
      const results: SearchResult[] = [];
      for (const match of queryResponse.matches || []) {
        if (match.metadata && match.metadata.text) {
          results.push({
            text: match.metadata.text as string,
            score: match.score || 0
          });
        }
      }
      
      console.log(`Pinecone search results for "${queryText}":`, results);
      return results;
      
    } catch (error) {
      console.error('Pinecone search error:', error);
      // 오류 시 빈 배열 반환 (Python 코드 스타일)
      return [];
    }
  }

  /**
   * Python의 generate_practice_prompt 함수 구현
   */
  async generatePracticePrompt(targetSentence: string): Promise<string> {
    const systemPrompt = "You are a dialogue writer crafting natural conversations.";
    const userPrompt = `Target sentence: "${targetSentence}"

Generate exactly three pairs of dialogue turns between speakers A(system) and B(user) that build up to the student needing to say the target sentence. 
Do NOT include the target sentence itself in the dialogue. 
Output only the lines, with a blank line between each pair, 
then output exactly '👉 Your turn to speak:' on the final line.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {"role": "system", "content": systemPrompt},
          {"role": "user", "content": userPrompt}
        ],
        temperature: 0.7
      });
      
      return response.choices[0].message.content?.trim() || "";
    } catch (error) {
      console.error('Practice prompt generation error:', error);
      return `Target sentence: "${targetSentence}"\n\n👉 Your turn to speak:`;
    }
  }

  /**
   * Python의 evaluate_response 함수 구현
   */
  async evaluateResponse(userResponse: string, targetSentence: string): Promise<string> {
    const systemPrompt = "You are a friendly English language coach. Please respond in Korean.";
    const userPrompt = `목표 표현: "${targetSentence}"
학생 답변: "${userResponse}"

학생이 목표 표현을 올바르게 사용했다면 "정답!"이라고만 답하세요.
그렇지 않으면 "틀렸습니다:" 뒤에 간단한 설명을 한국어로 해주세요.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {"role": "system", "content": systemPrompt},
          {"role": "user", "content": userPrompt}
        ],
        temperature: 0.3
      });
      
      const llmOutput = response.choices[0].message.content?.trim() || "";
      // 첫 번째 줄만 반환
      return llmOutput.split('\n')[0].trim();
    } catch (error) {
      console.error('Response evaluation error:', error);
      return "틀렸습니다: 평가 중 오류가 발생했습니다.";
    }
  }

  /**
   * Python의 practice_round 함수 구현 - 실제 Pinecone 검색 사용
   */
  async practiceRound(userInput: string, expressions: Expression[], topK = 1): Promise<PracticeRound> {
    try {
      // 1. 사용자 표현을 기반으로 검색 쿼리 생성 (Python 코드와 동일)
      const searchQuery = await this.generateSearchQuery(userInput);
      
      // 2. Pinecone에서 유사한 Friends 대사 검색 (Python 코드와 동일)
      const searchResults = await this.searchInPinecone(searchQuery, topK);
      
      // 3. 검색된 Friends 대사 중 가장 유사한 것을 타겟으로 사용
      const targetSentence = searchResults.length > 0 ? searchResults[0].text : userInput;
      
      console.log(`Original expression: "${userInput}"`);
      console.log(`Search query: "${searchQuery}"`);
      console.log(`Target from Pinecone: "${targetSentence}"`);
      console.log(`Search results:`, searchResults);
      
      // 4. 타겟 표현을 기반으로 연습 대화 생성 (Python 코드와 동일)
      const dialogueScript = await this.generatePracticePrompt(targetSentence);
      
      return {
        searchQuery,
        targetSentence,
        dialogueScript
      };
    } catch (error) {
      console.error('Practice round error:', error);
      return {
        searchQuery: userInput,
        targetSentence: userInput,
        dialogueScript: `🗣️ You are playing the role of speaker B in this conversation.\n\n👉 Your turn to speak:`
      };
    }
  }

  /**
   * 사용자 응답 평가 및 피드백
   */
  async evaluatePracticeResponse(userResponse: string, targetSentence: string): Promise<{
    isCorrect: boolean;
    feedback: string;
  }> {
    const evaluation = await this.evaluateResponse(userResponse, targetSentence);
    const isCorrect = evaluation === "정답!" || evaluation === "Correct!";
    
    return {
      isCorrect,
      feedback: evaluation
    };
  }

  /**
   * 표현 미리보기 (Python의 practice_loop_with_preview 일부) - 실제 Pinecone 검색 사용
   */
  async previewExpressions(expressions: Expression[]): Promise<{
    expression: Expression;
    searchQuery: string;
    topResults: SearchResult[];
  }[]> {
    try {
      const previews = [];
      
      for (const expr of expressions) {
        // 1. 검색 쿼리 생성 (Python 코드와 동일)
        const searchQuery = await this.generateSearchQuery(expr.text);
        
        // 2. Pinecone에서 상위 3개 유사 표현 검색 (Python 코드와 동일)
        const topResults = await this.searchInPinecone(searchQuery, 3);
        
        previews.push({
          expression: expr,
          searchQuery,
          topResults
        });
        
        console.log(`Preview for "${expr.text}":`, {
          searchQuery,
          topResults: topResults.map(r => `${r.text} (${r.score.toFixed(4)})`)
        });
      }
      
      return previews;
      
    } catch (error) {
      console.error('Preview generation error:', error);
      // 오류 시 기본 미리보기 반환
      return expressions.map(expr => ({
        expression: expr,
        searchQuery: `"${expr.text}"`,
        topResults: [{ text: expr.text, score: 1.0 }]
      }));
    }
  }

  /**
   * 문자열 유사도 계산 (단어 기반)
   */
  private calculateTextSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let commonWords = 0;
    for (const word1 of words1) {
      if (words2.includes(word1)) {
        commonWords++;
      }
    }
    
    const totalWords = Math.max(words1.length, words2.length);
    return totalWords > 0 ? commonWords / totalWords : 0;
  }

  /**
   * 단어 유사도 계산 (의미적 유사도)
   */
  private calculateWordSimilarity(query: string, text: string): number {
    // 키워드 기반 유사도 (감사, 도움, 인사 등)
    const thankKeywords = ['thank', 'thanks', 'appreciate', 'grateful'];
    const helpKeywords = ['help', 'assist', 'support', 'aid'];
    const greetKeywords = ['hello', 'hi', 'meet', 'nice', 'pleasure'];
    const requestKeywords = ['please', 'could', 'would', 'can', 'may'];
    
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    let score = 0;
    
    // 감사 표현 매칭
    if (thankKeywords.some(k => queryLower.includes(k)) && 
        thankKeywords.some(k => textLower.includes(k))) {
      score += 0.4;
    }
    
    // 도움 요청 표현 매칭
    if (helpKeywords.some(k => queryLower.includes(k)) && 
        helpKeywords.some(k => textLower.includes(k))) {
      score += 0.4;
    }
    
    // 인사 표현 매칭
    if (greetKeywords.some(k => queryLower.includes(k)) && 
        greetKeywords.some(k => textLower.includes(k))) {
      score += 0.4;
    }
    
    // 정중한 요청 표현 매칭
    if (requestKeywords.some(k => queryLower.includes(k)) && 
        requestKeywords.some(k => textLower.includes(k))) {
      score += 0.3;
    }
    
    return Math.min(1.0, score);
  }
}

export const friendsScriptService = new FriendsScriptService();