import OpenAI from "openai";
import { Expression } from "../shared/schema.js";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface RAGSearchResult {
  text: string;
  score: number;
}

export interface DialoguePair {
  speaker: 'A' | 'B';
  content: string;
}

export interface PracticeDialogue {
  targetSentence: string;
  dialoguePairs: DialoguePair[];
  finalPrompt: string;
}

export interface RAGEvaluationResult {
  isCorrect: boolean;
  feedback: string;
  targetSentence: string;
}

export class RAGService {
  
  /**
   * 사용자 입력을 바탕으로 검색 쿼리 생성
   */
  async generateSearchQuery(userInput: string): Promise<string> {
    try {
      const prompt = `You are an assistant helping an English learner search for example sentences in a spoken dialogue database.

The learner typed: "${userInput}"

Please generate a **concise search query** that focuses on the **key English expression or grammar pattern** they are trying to practice (e.g. "I wish", "It turns out", "I should have", etc.).

✅ Focus ONLY on reusable English expressions, grammar phrases, or sentence structures.
❌ Do NOT use specific nouns (e.g. "doctor", "coffee", "car") as the main focus of the search query.
✅ Your query should work even if the topic or noun is changed.

Return only the clean search query (1 sentence or phrase). No explanations.`;

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
   * 벡터 검색 시뮬레이션 (실제로는 저장된 표현들과 유사도 계산)
   */
  async searchSimilarExpressions(query: string, expressions: Expression[], topK = 3): Promise<RAGSearchResult[]> {
    try {
      // 실제 Pinecone 대신 저장된 표현들과 유사도 계산
      const results: RAGSearchResult[] = [];
      
      for (const expr of expressions) {
        const similarity = this.calculateSimilarity(query.toLowerCase(), expr.text.toLowerCase());
        results.push({
          text: expr.text,
          score: similarity
        });
      }
      
      // 유사도순으로 정렬하고 topK개만 반환
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
   * 타겟 문장을 위한 연습 대화 생성
   */
  async generatePracticeDialogue(targetSentence: string): Promise<PracticeDialogue> {
    try {
      const systemPrompt = "You are a dialogue writer crafting natural conversations.";
      const userPrompt = `Target sentence: "${targetSentence}"

Generate exactly three pairs of dialogue turns between speakers A(system) and B(user) that build up to the student needing to say the target sentence. 
Do NOT include the target sentence itself in the dialogue. 
Output only the lines, with a blank line between each pair, 
then output exactly '👉 Your turn to speak:' on the final line.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {"role": "system", "content": systemPrompt},
          {"role": "user", "content": userPrompt}
        ],
        temperature: 0.7
      });

      const dialogueText = response.choices[0].message.content || "";
      
      // 대화를 파싱하여 구조화
      const lines = dialogueText.split('\n').filter(line => line.trim());
      const dialoguePairs: DialoguePair[] = [];
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.includes('👉')) {
          // A와 B 화자 패턴 감지
          if (trimmedLine.startsWith('A:')) {
            dialoguePairs.push({
              speaker: 'A',
              content: trimmedLine.substring(2).trim()
            });
          } else if (trimmedLine.startsWith('B:')) {
            dialoguePairs.push({
              speaker: 'B', 
              content: trimmedLine.substring(2).trim()
            });
          } else {
            // 화자 표시가 없는 경우 순서에 따라 할당
            dialoguePairs.push({
              speaker: index % 2 === 0 ? 'A' : 'B',
              content: trimmedLine
            });
          }
        }
      });

      return {
        targetSentence,
        dialoguePairs,
        finalPrompt: "👉 Your turn to speak:"
      };

    } catch (error) {
      console.error('Practice dialogue generation error:', error);
      return {
        targetSentence,
        dialoguePairs: [
          { speaker: 'A', content: `Let's practice using: "${targetSentence}"` },
          { speaker: 'A', content: 'How would you respond in this situation?' }
        ],
        finalPrompt: "👉 Your turn to speak:"
      };
    }
  }

  /**
   * 사용자 응답 평가
   */
  async evaluateResponse(userResponse: string, targetSentence: string): Promise<RAGEvaluationResult> {
    try {
      const systemPrompt = "You are a friendly language coach.";
      const userPrompt = `Target sentence: "${targetSentence}"
Student response: "${userResponse}"

If the student used the target sentence correctly, reply ONLY with 'Correct!'. 
Otherwise, reply with 'Incorrect:' followed by a brief note in Korean.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {"role": "system", "content": systemPrompt},
          {"role": "user", "content": userPrompt}
        ],
        temperature: 0.3
      });

      const feedback = response.choices[0].message.content?.trim() || "";
      const isCorrect = feedback.startsWith('Correct!');

      return {
        isCorrect,
        feedback: isCorrect ? "✅ 정확합니다!" : feedback.replace('Incorrect:', '❌'),
        targetSentence
      };

    } catch (error) {
      console.error('Response evaluation error:', error);
      return {
        isCorrect: false,
        feedback: "❌ 평가 중 오류가 발생했습니다. 다시 시도해주세요.",
        targetSentence
      };
    }
  }

  /**
   * 문자열 유사도 계산 (간단한 Jaccard 유사도)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersectionCount = words1.filter(x => set2.has(x)).length;
    const unionCount = new Set([...words1, ...words2]).size;
    
    return unionCount > 0 ? intersectionCount / unionCount : 0;
  }
}

export const ragService = new RAGService();