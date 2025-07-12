# Daily Convo - English Conversation Practice App

## Overview

This is a full-stack English conversation practice application built with React, Express, and TypeScript. The app helps users practice English expressions through interactive chat scenarios, track their progress, and build their vocabulary through a categorized expression management system.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and building
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Animations**: Framer Motion for smooth UI transitions
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful API with JSON responses
- **Development**: Hot module replacement with Vite integration

### Project Structure
- `client/` - Frontend React application
- `server/` - Backend Express API
- `shared/` - Shared TypeScript schemas and types
- `migrations/` - Database migration files

## Key Components

### Data Models (shared/schema.ts)
- **Expressions**: User's English expressions with usage statistics
- **Chat Sessions**: Practice conversation sessions with scenarios
- **Chat Messages**: Individual messages within chat sessions
- **User Stats**: Overall user progress and statistics
- **Achievements**: Gamification elements for user engagement

### Frontend Components
- **Chat Interface**: Real-time conversation practice with AI-like responses
- **Expression Manager**: CRUD operations for English expressions with categorization
- **Progress Repository**: User statistics and achievement tracking
- **Navigation Header**: App navigation with user stats display

### Backend Services
- **Storage Layer**: Abstract interface with in-memory implementation for data persistence
- **API Routes**: RESTful endpoints for expressions, chat sessions, messages, and user stats
- **Middleware**: Request logging, error handling, and static file serving

## Data Flow

1. **Expression Management**: Users add expressions with categories, which are stored and tracked for usage statistics
2. **Chat Practice**: Users engage in scenario-based conversations, with the system tracking expression usage and correctness
3. **Progress Tracking**: User actions update statistics, streaks, and unlock achievements
4. **Real-time Updates**: TanStack Query provides optimistic updates and cache invalidation for responsive UI

## External Dependencies

### Core Technologies
- **Database**: Neon Database (serverless PostgreSQL)
- **UI Components**: Radix UI primitives via Shadcn/ui
- **Animation**: Framer Motion for smooth transitions
- **Form Validation**: Zod for runtime type checking
- **Date Handling**: date-fns for date manipulation

### Development Tools
- **Build**: Vite with React plugin
- **Database**: Drizzle Kit for migrations and schema management
- **TypeScript**: Full-stack type safety
- **ESBuild**: Production bundling for server code

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for frontend
- TSX for server development with auto-reload
- Replit integration with development banner and cartographer

### Production Build
- Frontend: Vite builds to `dist/public/`
- Backend: ESBuild bundles server to `dist/index.js`
- Database: Firebase Firestore with authentication-based security
- Static files served by Express in production

### Environment Configuration
- Firebase configuration via VITE_* environment variables
- Development/production mode detection via `NODE_ENV`
- AWS deployment ready with dailyconvo.com domain configuration
- Google Authentication required for all app access

## New Tutoring Engine Architecture

### 5-Step Systematic Approach
The app now uses a sophisticated tutoring engine with the following functions:

1. **initializeSession** - Sets up session state with expression tracking
2. **processUserAnswer** - Detects expressions and updates completion status  
3. **getNextPrompt** - Generates contextual scenarios for remaining expressions
4. **shouldEndSession** - Checks if all expressions are completed
5. **summarizeResults** - Provides detailed session statistics

### Key Features
- **Expression Order Flexibility**: Users can practice expressions in any order
- **Real-time State Management**: Session state persists until completion
- **Smart Expression Detection**: 80%+ similarity threshold with Levenshtein distance
- **No Auto-Reset**: Sessions only end when user completes all expressions
- **Detailed Feedback**: Comprehensive completion summaries with timing and accuracy

### Implementation Details
- **Backend**: `server/tutoring-engine.ts` - Core tutoring logic
- **Routes**: `server/routes.ts` - Integration with existing API
- **Frontend**: Real-time checklist updates and session management
- **Storage**: Expression state tracking in memory during sessions

## Changelog

```
Changelog:
- July 03, 2025. Initial setup with English conversation practice app
- July 03, 2025. Firebase integration prepared with AI service architecture
- July 03, 2025. Added LLM/RAG/Vector DB integration framework
- July 03, 2025. Rebranded to "Daily Convo" and integrated Google AdSense ads
- July 03, 2025. Optimized layout with responsive ad placement for deployment
- July 10, 2025. Complete tutoring engine redesign with 5-step systematic approach
- July 10, 2025. Implemented expression order flexibility and proper session management
- July 10, 2025. Fixed auto-reset issues and added comprehensive result summaries
- July 10, 2025. Completed incorrect answer processing system with immediate failure handling
- July 10, 2025. Enhanced session completion modal with success/failure visual indicators
- July 12, 2025. Complete OpenAI integration replacing Gemini AI system
- July 12, 2025. New conversation architecture: 1) Random expression selection 2) GPT-4o scenario generation 3) Conversation evaluation 4) Whisper voice transcription 5) Grammar correction feedback
- July 12, 2025. Firebase Authentication and storage implementation with Google sign-in and auth-based security rules
- July 12, 2025. AWS deployment configuration for dailyconvo.com domain (non-Replit deployment)
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
App branding: "Daily Convo" for English conversation practice
Deployment goal: AWS deployment with dailyconvo.com domain (not Replit deployment)
Design priority: Clean, creative design that attracts users
Firebase: Authentication required for all users, Google sign-in only
```

## AdSense Integration

### Ad Placement Strategy
- **Desktop**: Right sidebar with sticky positioning
- **Mobile**: Bottom banner for better mobile experience  
- **Responsive**: Adapts to screen size automatically
- **Design**: Three styles (minimal, gradient, outlined) to match app aesthetics

### Ad Configuration
- Top sidebar ad: Auto format, minimal style
- Middle sidebar ad: Vertical format, gradient style (desktop only)
- Bottom banner: Horizontal format, outlined style (mobile only)
- All ads use placeholder slots (1234567890, 1234567891, 1234567892)

### Implementation Notes
- AdSense script loaded in HTML head
- TypeScript declarations for window.adsbygoogle
- Development placeholders show ad locations
- Production ready for actual AdSense account setup