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
    'nav.streak': 'Streak',
    
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
    'chat.title': 'Conversation Practice Setup',
    'chat.description': 'Select a category and specific expressions to practice in focused conversation scenarios.',
    'chat.category.selection': 'Category Selection',
    'chat.start.practice': 'Start Practice',
    'chat.select.expressions': 'Select expressions to practice',
    'chat.no.expressions': 'No expressions available. Add some expressions first!',
    'chat.typing': 'AI is typing...',
    'chat.type.message': 'Type your message...',
    'chat.expressions.count': 'expressions',
    'chat.back': 'Back',
    'chat.select.all': 'Select All',
    'chat.deselect.all': 'Deselect All',
    'chat.selected': 'selected',
    'chat.start.conversation': 'Start Conversation',
    'expressions.total': 'expressions',
    'chat.practicing': 'practicing',
    'chat.session.progress': 'Session Progress',
    'chat.expressions.used': 'expressions used',
    'chat.new.practice': 'New Practice',
    'chat.placeholder': 'Use the selected expressions to have a conversation...',
    'chat.new.expression': 'New expression',
    'chat.never': 'Never',
    'chat.attempts': 'attempts',
    'expressions.practicing': 'Practicing expressions',
    'expressions.completed': 'Completed',
    'expressions.click.to.use': 'Click to use',
    
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
    'expressions.english.expression': 'English Expression',
    'expressions.placeholder': 'e.g., Could you please help me with...',
    'expressions.category.optional': 'Category (Optional)',
    'expressions.uncategorized': 'Uncategorized',
    'expressions.create.category': 'Create New Category',
    'expressions.create.description': 'Create a new category to organize your expressions.',
    'expressions.category.name': 'Category Name',
    'expressions.category.placeholder': 'e.g., Daily Conversations',
    'expressions.icon': 'Icon',
    'expressions.color.theme': 'Color Theme',
    'expressions.creating': 'Creating...',
    'expressions.create': 'Create Category',
    'expressions.saving': 'Saving...',
    'expressions.save.expression': '💾 Save Expression',
    'expressions.never.used': 'Never used',
    'expressions.last.used': 'Last used',
    'expressions.accuracy': 'Accuracy',
    'expressions.update': 'Update',
    'expressions.confirm.delete': 'Are you sure you want to delete this expression?',
    'expressions.delete.warning': 'This action cannot be undone.',
    'expressions.no.expressions.yet': 'No expressions yet',
    'expressions.start.adding': 'Start by adding your first English expression above!',
    'expressions.edit.title': 'Edit Expression',
    'expressions.edit.description': 'You can change the text or category of the expression.',
    'expressions.text': 'Expression Text',
    'expressions.enter.english': 'Enter English expression...',
    'expressions.count': 'expressions',
    'expressions.used': 'Used',
    'expressions.times': 'times',
    'expressions.new': 'New',
    
    // Categories
    'categories.add': 'Add Category',
    'categories.name': 'Category Name',
    'categories.enter.name': 'Enter category name...',
    'categories.edit.title': 'Edit Category',
    'categories.edit.description': 'You can change the name, icon, and color of the category.',
    'categories.delete.title': 'Delete Category',
    'categories.delete.description': 'Are you sure you want to delete "{name}" category? Expressions in this category will be moved to uncategorized.',
    
    // Progress
    'progress.title': 'Progress Repository',
    'progress.total.sessions': 'Total Sessions',
    'progress.current.streak': 'Current Streak',
    'progress.expressions.learned': 'Expressions Learned',
    'progress.avg.accuracy': 'Average Accuracy',
    'progress.total.expressions': 'Total Expressions',
    'progress.overall.accuracy': 'Overall Accuracy',
    'progress.practice.sessions': 'Practice Sessions',
    'progress.days': 'days',
    'progress.achievements': 'Achievements',
    'progress.recent.activity': 'Recent Activity',
    'progress.performance': 'Performance by Category',
    'progress.expression.stats': 'Expression Statistics',
    
    // Time formats
    'time.minutes': 'min',
    'time.seconds': 'sec',
  },
  ko: {
    // Navigation
    'nav.expressions': '표현 관리',
    'nav.practice': '연습하기',
    'nav.progress': '진행상황',
    'nav.streak': '연속 기록',
    
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
    'chat.title': '대화 연습 설정',
    'chat.description': '연습하고 싶은 카테고리를 선택하고, 특정 표현들을 골라서 집중 연습해보세요.',
    'chat.category.selection': '카테고리 선택',
    'chat.start.practice': '연습 시작',
    'chat.select.expressions': '연습할 표현을 선택하세요',
    'chat.no.expressions': '사용 가능한 표현이 없습니다. 먼저 표현을 추가해주세요!',
    'chat.typing': 'AI가 입력 중...',
    'chat.type.message': '메시지를 입력하세요...',
    'chat.expressions.count': '개 표현',
    'chat.back': '뒤로가기',
    'chat.select.all': '전체 선택',
    'chat.deselect.all': '전체 해제',
    'chat.selected': '선택됨',
    'chat.start.conversation': '대화 시작하기',
    'expressions.total': '개 표현',
    'chat.practicing': '연습중',
    'chat.session.progress': 'Session Progress',
    'chat.expressions.used': 'expressions used',
    'chat.new.practice': '새 연습',
    'chat.placeholder': '선택한 표현들을 사용해서 대화해보세요...',
    'chat.new.expression': '새로운 표현',
    'chat.never': 'Never',
    'chat.attempts': 'attempts',
    'expressions.practicing': '연습중인 표현들',
    'expressions.completed': '완료됨',
    'expressions.click.to.use': '클릭해서 사용하기',
    
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
    'expressions.english.expression': 'English Expression',
    'expressions.placeholder': 'e.g., Could you please help me with...',
    'expressions.category.optional': 'Category (Optional)',
    'expressions.uncategorized': '미분류',
    'expressions.create.category': '새 카테고리 만들기',
    'expressions.create.description': '새로운 카테고리를 만들어 표현들을 분류해보세요.',
    'expressions.category.name': 'Category Name',
    'expressions.category.placeholder': 'e.g., Daily Conversations',
    'expressions.icon': 'Icon',
    'expressions.color.theme': 'Color Theme',
    'expressions.creating': 'Creating...',
    'expressions.create': 'Create Category',
    'expressions.saving': 'Saving...',
    'expressions.save.expression': '💾 표현 저장',
    'expressions.never.used': 'Never used',
    'expressions.last.used': 'Last used',
    'expressions.accuracy': 'Accuracy',
    'expressions.update': 'Update',
    'expressions.confirm.delete': 'Are you sure you want to delete this expression?',
    'expressions.delete.warning': 'This action cannot be undone.',
    'expressions.no.expressions.yet': 'No expressions yet',
    'expressions.start.adding': 'Start by adding your first English expression above!',
    'expressions.edit.title': '표현 수정',
    'expressions.edit.description': '표현의 텍스트나 카테고리를 변경할 수 있습니다.',
    'expressions.text': '표현 텍스트',
    'expressions.enter.english': '영어 표현을 입력하세요',
    'expressions.count': '개 표현',
    'expressions.used': '사용됨',
    'expressions.times': '번',
    'expressions.new': '새로움',
    
    // Categories
    'categories.add': '카테고리 추가',
    'categories.name': '카테고리 이름',
    'categories.enter.name': '카테고리 이름 입력...',
    'categories.edit.title': '카테고리 수정',
    'categories.edit.description': '카테고리의 이름, 아이콘, 색상을 변경할 수 있습니다.',
    'categories.delete.title': '카테고리 삭제',
    'categories.delete.description': '"{name}" 카테고리를 삭제하시겠습니까? 이 카테고리에 속한 표현들은 미분류로 이동됩니다.',
    
    // Progress
    'progress.title': '진행 상황',
    'progress.total.sessions': '총 세션',
    'progress.current.streak': '현재 연속',
    'progress.expressions.learned': '학습한 표현',
    'progress.avg.accuracy': '평균 정확도',
    'progress.total.expressions': '총 표현',
    'progress.overall.accuracy': '전체 정확도',
    'progress.practice.sessions': '연습 세션',
    'progress.days': '일',
    'progress.achievements': '성취',
    'progress.recent.activity': '최근 활동',
    'progress.performance': '카테고리별 성과',
    'progress.expression.stats': '표현 통계',
    'progress.no.expressions': '아직 추적할 표현이 없습니다. 표현을 추가하여 진행 상황을 확인하세요!',
    
    // Time formats
    'time.minutes': '분',
    'time.seconds': '초',
    
    // Achievements
    'achievements.streak.title': '7일 연속',
    'achievements.streak.description': '계속 화이팅!',
    'achievements.perfect.title': '첫 완벽',
    'achievements.perfect.description': '100% 정확도',
    'achievements.learner.title': '빠른 학습자',
    'achievements.learner.description': '10개 이상 표현',
    'achievements.conversationalist.title': '대화 전문가',
    'achievements.conversationalist.description': '20개 이상 세션',
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
    const translation = translations[language]?.[key];
    if (translation) {
      return translation;
    }
    // Fallback to English if key not found in current language
    if (language !== 'en') {
      return translations.en[key] || key;
    }
    // Debug logging for missing keys
    if (process.env.NODE_ENV === 'development' && !translations.en[key]) {
      console.warn(`Missing translation key: ${key}`);
    }
    return key;
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