import OpenAI from "openai";
import { Expression } from "../shared/schema.js";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

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
   * Python의 search_in_pinecone 함수 구현 (로컬 표현 검색으로 대체)
   */
  async searchInExpressions(queryText: string, expressions: Expression[], topK = 3): Promise<SearchResult[]> {
    try {
      // 실제 벡터 검색 대신 문자열 유사도 기반 검색
      const results: SearchResult[] = [];
      
      for (const expr of expressions) {
        const score = this.calculateTextSimilarity(queryText.toLowerCase(), expr.text.toLowerCase());
        results.push({
          text: expr.text,
          score: Math.min(0.99, score) // 최대값 0.99로 제한
        });
      }
      
      // 점수순으로 정렬하고 topK개 반환
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
        
    } catch (error) {
      console.error('Expression search error:', error);
      return expressions.slice(0, topK).map(expr => ({
        text: expr.text,
        score: 0.5
      }));
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
   * Python의 practice_round 함수 구현 - 특정 표현에 대한 연습
   */
  async practiceRound(userInput: string, expressions: Expression[], topK = 1): Promise<PracticeRound> {
    try {
      // userInput이 이미 선택된 표현이므로 직접 사용
      const targetSentence = userInput;
      
      // 1. 해당 표현에 대한 검색 쿼리 생성 (표현 분석용)
      const searchQuery = await this.generateSearchQuery(userInput);
      
      // 2. 연습 대화 생성 (타겟 표현 기반)
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
   * 표현 미리보기 (Python의 practice_loop_with_preview 일부) - 병렬 처리로 최적화
   */
  async previewExpressions(expressions: Expression[]): Promise<{
    expression: Expression;
    searchQuery: string;
    topResults: SearchResult[];
  }[]> {
    try {
      // 병렬로 검색 쿼리 생성
      const searchQueries = await Promise.all(
        expressions.map(expr => this.generateSearchQuery(expr.text))
      );
      
      // 각 표현에 대한 미리보기 생성
      const previews = searchQueries.map((searchQuery, index) => {
        const expr = expressions[index];
        const topResults = this.searchInExpressions(searchQuery, expressions, 3);
        
        return {
          expression: expr,
          searchQuery,
          topResults: topResults // 동기 처리로 변경
        };
      });
      
      return await Promise.all(previews.map(async p => ({
        ...p,
        topResults: await p.topResults
      })));
      
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
}

export const friendsScriptService = new FriendsScriptService();