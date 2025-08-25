import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ko";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    "nav.expressions": "Expressions",
    "nav.practice": "Practice",
    "nav.progress": "Progress",
    "nav.streak": "Streak",

    // Session Complete Modal
    "session.complete": "Practice Complete!",
    "session.congratulations": "🎉 Congratulations!",
    "session.practice.complete": "📚 Practice Complete!",
    "session.practice.done": "💪 Practice Complete!",
    "session.all.expressions.success":
      "You have successfully practiced all expressions!",
    "session.all.expressions.done":
      "You have practiced all expressions. Keep practicing to get better!",
    "session.completed.expressions": "Completed Expressions",
    "session.accuracy": "Accuracy",
    "session.duration": "Duration",
    "session.total.attempts": "Total Attempts",
    "session.practiced.expressions": "Practiced Expressions",
    "session.attempts.suffix": "attempts",
    "session.achievement.excellent": "🌟 Excellent Performance!",
    "session.achievement.good": "👍 Good Performance!",
    "session.achievement.helpful": "💪 Practice was helpful!",
    "session.achievement.perfect":
      "Perfect accuracy with all expressions mastered!",
    "session.achievement.good.accuracy":
      "Good accuracy in practicing expressions!",
    "session.achievement.keep.practicing":
      "You completed all expressions. Keep practicing to get better!",
    "session.close": "Close",
    "session.back.home": "Back to Home",
    "session.success": "Success",
    "session.failed": "Failed",

    // Chat Interface
    "chat.title": "Conversation Practice Setup",
    "chat.description":
      "Select a category and specific expressions to practice in focused conversation scenarios.",
    "chat.category.selection": "Category Selection",
    "chat.start.practice": "Start Practice",
    "chat.select.expressions": "Select expressions to practice",
    "chat.no.expressions":
      "No expressions available. Add some expressions first!",
    "chat.typing": "AI is typing...",
    "chat.type.message": "Type your message...",
    "chat.expressions.count": "expressions",
    "chat.back": "Back",
    "chat.select.all": "Select All",
    "chat.deselect.all": "Deselect All",
    "chat.selected": "selected",
    "chat.start.conversation": "Start Conversation",
    "expressions.total": "expressions",
    "chat.practicing": "practicing",
    "chat.session.progress": "Session Progress",
    "chat.expressions.used": "expressions used",
    "chat.new.practice": "New Practice",
    "chat.placeholder":
      "Use the selected expressions to have a conversation...",
    "chat.new.expression": "New expression",
    "chat.never": "Never",
    "chat.attempts": "attempts",
    "expressions.practicing": "Practicing expressions",
    "expressions.completed": "Completed",
    "expressions.click.to.use": "Click to use",
    "chat.select.category": "Select Category",
    "chat.selected.expressions": "Selected Expressions",
    "chat.starting": "Starting...",
    "chat.conversation": "Conversation Practice",
    "chat.target": "Target",
    "chat.new.session": "New Session",
    "chat.session.complete": "Session completed! Great job!",
    "chat.start.session": "Start Session",

    // Expression Manager
    "expressions.title": "Expression Manager",
    "expressions.add": "Add Expression",
    "expressions.category": "Category",
    "expressions.expression": "Expression",
    "expressions.usage.count": "Usage Count",
    "expressions.correct.rate": "Correct Rate",
    "expressions.actions": "Actions",
    "expressions.edit": "Edit",
    "expressions.delete": "Delete",
    "expressions.save": "Save",
    "expressions.cancel": "Cancel",
    "expressions.add.new": "Add New Expression",
    "expressions.enter.text": "Enter expression text...",
    "expressions.select.category": "Select category",
    "expressions.english.expression": "English Expression",
    "expressions.placeholder": "e.g., Could you please help me with...",
    "expressions.category.optional": "Category (Optional)",
    "expressions.uncategorized": "Uncategorized",
    "expressions.create.category": "Create New Category",
    "expressions.create.description":
      "Create a new category to organize your expressions.",
    "expressions.category.name": "Category Name",
    "expressions.category.placeholder": "e.g., Daily Conversations",
    "expressions.icon": "Icon",
    "expressions.color.theme": "Color Theme",
    "expressions.creating": "Creating...",
    "expressions.create": "Create Category",
    "expressions.saving": "Saving...",
    "expressions.save.expression": "💾 Save Expression",
    "expressions.never.used": "Never used",
    "expressions.last.used": "Last used",
    "expressions.accuracy": "Accuracy",
    "expressions.update": "Update",
    "expressions.confirm.delete":
      "Are you sure you want to delete this expression?",
    "expressions.delete.warning": "This action cannot be undone.",
    "expressions.no.expressions.yet": "No expressions yet",
    "expressions.start.adding":
      "Start by adding your first English expression above!",
    "expressions.edit.title": "Edit Expression",
    "expressions.edit.description":
      "You can change the text or category of the expression.",
    "expressions.text": "Expression Text",
    "expressions.enter.english": "Enter English expression...",
    "expressions.count": "expressions",
    "expressions.used": "Used",
    "expressions.times": "times",
    "expressions.new": "New",

    // Categories
    "categories.add": "Add Category",
    "categories.name": "Category Name",
    "categories.enter.name": "Enter category name...",
    "categories.edit.title": "Edit Category",
    "categories.edit.description":
      "You can change the name, icon, and color of the category.",
    "categories.delete.title": "Delete Category",
    "categories.delete.description":
      'Are you sure you want to delete "{name}" category? Expressions in this category will be moved to uncategorized.',

    // Progress
    "progress.title": "Progress Repository",
    "progress.total.sessions": "Total Sessions",
    "progress.current.streak": "Current Streak",
    "progress.expressions.learned": "Expressions Learned",
    "progress.avg.accuracy": "Average Accuracy",
    "progress.total.expressions": "Total Expressions",
    "progress.overall.accuracy": "Overall Accuracy",
    "progress.practice.sessions": "Practice Sessions",
    "progress.days": "days",
    "progress.achievements": "Achievements",
    "progress.recent.activity": "Recent Activity",
    "progress.performance": "Performance by Category",
    "progress.expression.stats": "Expression Statistics",

    // Time formats
    "time.minutes": "min",
    "time.seconds": "sec",
  },
  ko: {
    // Navigation
    "nav.expressions": "Expression Management",
    "nav.practice": "Practice",
    "nav.progress": "Progress",
    "nav.streak": "Streak",

    // Session Complete Modal
    "session.complete": "Practice Complete!",
    "session.congratulations": "🎉 Congratulations!",
    "session.practice.complete": "📚 Practice Complete!",
    "session.practice.done": "💪 Practice Done!",
    "session.all.expressions.success":
      "Successfully practiced all expressions!",
    "session.all.expressions.done":
      "All expressions practiced. Keep practicing to improve!",
    "session.completed.expressions": "Completed Expressions",
    "session.accuracy": "Accuracy",
    "session.duration": "Duration",
    "session.total.attempts": "Total Attempts",
    "session.practiced.expressions": "Practiced Expressions",
    "session.attempts.suffix": " attempts",
    "session.achievement.excellent": "🌟 Excellent performance!",
    "session.achievement.good": "👍 Good performance!",
    "session.achievement.helpful": "💪 Practice was helpful!",
    "session.achievement.perfect":
      "Mastered all expressions with perfect accuracy!",
    "session.achievement.good.accuracy":
      "Practiced expressions well with good accuracy!",
    "session.achievement.keep.practicing":
      "Completed all expressions. Keep practicing to improve!",
    "session.close": "Close",
    "session.back.home": "Back to Home",
    "session.success": "Success",
    "session.failed": "Failed",

    // Chat Interface
    "chat.title": "Conversation Practice Setup",
    "chat.description":
      "Select a category you want to practice and choose specific expressions to focus on.",
    "chat.category.selection": "Category Selection",
    "chat.start.practice": "Start Practice",
    "chat.select.expressions": "Select expressions to practice",
    "chat.no.expressions":
      "No expressions available. Please add expressions first!",
    "chat.typing": "AI is typing...",
    "chat.type.message": "Type your message...",
    "chat.expressions.count": " expressions",
    "chat.back": "Back",
    "chat.select.all": "Select All",
    "chat.deselect.all": "Deselect All",
    "chat.selected": "Selected",
    "chat.start.conversation": "Start Conversation",
    "expressions.total": " expressions",
    "chat.practicing": "Practicing",
    "chat.session.progress": "Session Progress",
    "chat.expressions.used": "expressions used",
    "chat.new.practice": "New Practice",
    "chat.placeholder": "Use the selected expressions to chat...",
    "chat.new.expression": "New Expression",
    "chat.never": "Never",
    "chat.attempts": "attempts",
    "expressions.practicing": "Expressions Being Practiced",
    "chat.select.category": "Select Category",
    "chat.selected.expressions": "Selected Expressions",
    "chat.starting": "Starting...",
    "chat.conversation": "Conversation Practice",
    "chat.target": "Target",
    "chat.new.session": "New Session",
    "chat.session.complete": "Session Complete! Well done!",
    "chat.start.session": "Start Session",
    "expressions.completed": "Completed",
    "expressions.click.to.use": "Click to use",

    // Expression Manager
    "expressions.title": "Expression Management",
    "expressions.add": "Add Expression",
    "expressions.category": "Category",
    "expressions.expression": "Expression",
    "expressions.usage.count": "Usage Count",
    "expressions.correct.rate": "Correct Rate",
    "expressions.actions": "Actions",
    "expressions.edit": "Edit",
    "expressions.delete": "Delete",
    "expressions.save": "Save",
    "expressions.cancel": "Cancel",
    "expressions.add.new": "Add New Expression",
    "expressions.enter.text": "Enter expression text...",
    "expressions.select.category": "Select Category",
    "expressions.english.expression": "English Expression",
    "expressions.placeholder": "e.g., Could you please help me with...",
    "expressions.category.optional": "Category (Optional)",
    "expressions.uncategorized": "Uncategorized",
    "expressions.create.category": "Create New Category",
    "expressions.create.description":
      "Create a new category to organize your expressions.",
    "expressions.category.name": "Category Name",
    "expressions.category.placeholder": "e.g., Daily Conversations",
    "expressions.icon": "Icon",
    "expressions.color.theme": "Color Theme",
    "expressions.creating": "Creating...",
    "expressions.create": "Create Category",
    "expressions.saving": "Saving...",
    "expressions.save.expression": "💾 Save Expression",
    "expressions.never.used": "Never used",
    "expressions.last.used": "Last used",
    "expressions.accuracy": "Accuracy",
    "expressions.update": "Update",
    "expressions.confirm.delete":
      "Are you sure you want to delete this expression?",
    "expressions.delete.warning": "This action cannot be undone.",
    "expressions.no.expressions.yet": "No expressions yet",
    "expressions.start.adding":
      "Start by adding your first English expression above!",
    "expressions.edit.title": "Edit Expression",
    "expressions.edit.description":
      "You can change the text or category of the expression.",
    "expressions.text": "Expression Text",
    "expressions.enter.english": "Enter English expression",
    "expressions.count": " expressions",
    "expressions.used": "Used",
    "expressions.times": " times",
    "expressions.new": "New",

    // Categories
    "categories.add": "Add Category",
    "categories.name": "Category Name",
    "categories.enter.name": "Enter category name...",
    "categories.edit.title": "Edit Category",
    "categories.edit.description":
      "You can change the name, icon, and color of the category.",
    "categories.delete.title": "Delete Category",
    "categories.delete.description":
      'Are you sure you want to delete the "{name}" category? Expressions in this category will be moved to uncategorized.',

    // Progress
    "progress.title": "Progress",
    "progress.total.sessions": "Total Sessions",
    "progress.current.streak": "Current Streak",
    "progress.expressions.learned": "Expressions Learned",
    "progress.avg.accuracy": "Average Accuracy",
    "progress.total.expressions": "Total Expressions",
    "progress.overall.accuracy": "Overall Accuracy",
    "progress.practice.sessions": "Practice Sessions",
    "progress.days": "days",
    "progress.achievements": "Achievements",
    "progress.recent.activity": "Recent Activity",
    "progress.performance": "Performance by Category",
    "progress.expression.stats": "Expression Statistics",
    "progress.no.expressions":
      "No expressions to track yet. Add expressions to see your progress!",

    // Time formats
    "time.minutes": "min",
    "time.seconds": "sec",

    // Achievements
    "achievements.streak.title": "7-Day Streak",
    "achievements.streak.description": "Keep it up!",
    "achievements.perfect.title": "First Perfect",
    "achievements.perfect.description": "100% Accuracy",
    "achievements.learner.title": "Fast Learner",
    "achievements.learner.description": "10+ Expressions",
    "achievements.conversationalist.title": "Conversation Expert",
    "achievements.conversationalist.description": "20+ Sessions",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en"); // Default to English

  useEffect(() => {
    const savedLanguage = localStorage.getItem(
      "dailyconvo-language"
    ) as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "ko")) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("dailyconvo-language", lang);
  };

  const t = (key: string): string => {
    const languageTranslations = translations[language] as Record<string, string>;
    const translation = languageTranslations?.[key];
    if (translation) {
      return translation;
    }
    // Fallback to English if key not found in current language
    if (language !== "en") {
      const enTranslations = translations.en as Record<string, string>;
      return enTranslations[key] || key;
    }
    // Debug logging for missing keys
    if (process.env.NODE_ENV === "development") {
      const enTranslations = translations.en as Record<string, string>;
      if (!enTranslations[key]) {
        console.warn(`Missing translation key: ${key}`);
      }
    }
    return key;
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
