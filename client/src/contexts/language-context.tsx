import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ko';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.expressions': 'Expressions',
    'nav.practice': 'Practice',
    'nav.progress': 'Progress',
    
    // Session Complete Modal
    'session.complete': 'Practice Complete!',
    'session.congratulations': '🎉 Congratulations!',
    'session.practice.complete': '📚 Practice Complete!',
    'session.practice.done': '💪 Practice Complete!',
    'session.all.expressions.success': 'You have successfully practiced all expressions!',
    'session.all.expressions.done': 'You have practiced all expressions. Keep practicing to get better!',
    'session.completed.expressions': 'Completed Expressions',
    'session.accuracy': 'Accuracy',
    'session.duration': 'Duration',
    'session.total.attempts': 'Total Attempts',
    'session.practiced.expressions': 'Practiced Expressions',
    'session.attempts.suffix': 'attempts',
    'session.achievement.excellent': '🌟 Excellent Performance!',
    'session.achievement.good': '👍 Good Performance!',
    'session.achievement.helpful': '💪 Practice was helpful!',
    'session.achievement.perfect': 'Perfect accuracy with all expressions mastered!',
    'session.achievement.good.accuracy': 'Good accuracy in practicing expressions!',
    'session.achievement.keep.practicing': 'You completed all expressions. Keep practicing to get better!',
    'session.close': 'Close',
    'session.back.home': 'Back to Home',
    'session.success': 'Success',
    'session.failed': 'Failed',
    
    // Chat Interface
    'chat.start.practice': 'Start Practice',
    'chat.select.expressions': 'Select expressions to practice',
    'chat.no.expressions': 'No expressions available. Add some expressions first!',
    'chat.typing': 'AI is typing...',
    'chat.type.message': 'Type your message...',
    
    // Expression Manager
    'expressions.title': 'Expression Manager',
    'expressions.add': 'Add Expression',
    'expressions.category': 'Category',
    'expressions.expression': 'Expression',
    'expressions.usage.count': 'Usage Count',
    'expressions.correct.rate': 'Correct Rate',
    'expressions.actions': 'Actions',
    'expressions.edit': 'Edit',
    'expressions.delete': 'Delete',
    'expressions.save': 'Save',
    'expressions.cancel': 'Cancel',
    'expressions.add.new': 'Add New Expression',
    'expressions.enter.text': 'Enter expression text...',
    'expressions.select.category': 'Select category',
    
    // Categories
    'categories.add': 'Add Category',
    'categories.name': 'Category Name',
    'categories.enter.name': 'Enter category name...',
    
    // Progress
    'progress.title': 'Progress Repository',
    'progress.total.sessions': 'Total Sessions',
    'progress.current.streak': 'Current Streak',
    'progress.expressions.learned': 'Expressions Learned',
    'progress.avg.accuracy': 'Average Accuracy',
    
    // Time formats
    'time.minutes': 'min',
    'time.seconds': 'sec',
  },
  ko: {
    // Navigation
    'nav.expressions': '표현 관리',
    'nav.practice': '연습하기',
    'nav.progress': '진행상황',
    
    // Session Complete Modal
    'session.complete': '연습 완료!',
    'session.congratulations': '🎉 축하합니다!',
    'session.practice.complete': '📚 연습 완료!',
    'session.practice.done': '💪 연습 완료!',
    'session.all.expressions.success': '모든 표현을 성공적으로 연습했습니다!',
    'session.all.expressions.done': '모든 표현을 연습했습니다. 계속 연습하면 더 좋아질 거예요!',
    'session.completed.expressions': '완료된 표현',
    'session.accuracy': '정확도',
    'session.duration': '소요 시간',
    'session.total.attempts': '총 시도',
    'session.practiced.expressions': '연습 완료된 표현들',
    'session.attempts.suffix': '회 시도',
    'session.achievement.excellent': '🌟 훌륭한 성과입니다!',
    'session.achievement.good': '👍 좋은 성과입니다!',
    'session.achievement.helpful': '💪 연습이 도움이 됐습니다!',
    'session.achievement.perfect': '완벽한 정확도로 모든 표현을 마스터했습니다!',
    'session.achievement.good.accuracy': '좋은 정확도로 표현들을 잘 연습했습니다!',
    'session.achievement.keep.practicing': '모든 표현을 완료했습니다. 계속 연습하면 더 좋아질 거예요!',
    'session.close': '닫기',
    'session.back.home': '처음으로 돌아가기',
    'session.success': '성공',
    'session.failed': '실패',
    
    // Chat Interface
    'chat.start.practice': '연습 시작',
    'chat.select.expressions': '연습할 표현을 선택하세요',
    'chat.no.expressions': '사용 가능한 표현이 없습니다. 먼저 표현을 추가해주세요!',
    'chat.typing': 'AI가 입력 중...',
    'chat.type.message': '메시지를 입력하세요...',
    
    // Expression Manager
    'expressions.title': '표현 관리',
    'expressions.add': '표현 추가',
    'expressions.category': '카테고리',
    'expressions.expression': '표현',
    'expressions.usage.count': '사용 횟수',
    'expressions.correct.rate': '정답률',
    'expressions.actions': '작업',
    'expressions.edit': '수정',
    'expressions.delete': '삭제',
    'expressions.save': '저장',
    'expressions.cancel': '취소',
    'expressions.add.new': '새 표현 추가',
    'expressions.enter.text': '표현 텍스트 입력...',
    'expressions.select.category': '카테고리 선택',
    
    // Categories
    'categories.add': '카테고리 추가',
    'categories.name': '카테고리 이름',
    'categories.enter.name': '카테고리 이름 입력...',
    
    // Progress
    'progress.title': '진행 상황',
    'progress.total.sessions': '총 세션',
    'progress.current.streak': '현재 연속',
    'progress.expressions.learned': '학습한 표현',
    'progress.avg.accuracy': '평균 정확도',
    
    // Time formats
    'time.minutes': '분',
    'time.seconds': '초',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en'); // Default to English

  useEffect(() => {
    const savedLanguage = localStorage.getItem('dailyconvo-language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ko')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('dailyconvo-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}