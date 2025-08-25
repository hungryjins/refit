# English Conversation Coach

An AI-powered learning platform for English conversation practice.

## 🚀 Technology Stack

### Frontend

- **React 18** + **TypeScript**
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Query** - State Management

### Backend

- **Firebase Functions** - Serverless Backend
- **Firestore** - NoSQL Database
- **Firebase Auth** - User Authentication

### AI/ML

- **OpenAI GPT-4** - Conversation Generation and Evaluation
- **Pinecone** - Vector Search (2,872 embeddings)

### Deployment

- **Firebase Hosting** - Frontend Deployment
- **GitHub Actions** - Automated Deployment

## 🌐 Deployed Sites

- **Website**: https://conversation-practice-f2199.web.app
- **Domain**: https://dailyconvo.com (DNS configuration in progress)

## 🛠️ Local Development

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase CLI

### Installation and Setup

1. **Clone Repository**

```bash
git clone <repository-url>
cd EnglishConvoCoach
```

2. **Install Dependencies**

```bash
npm install
cd functions && npm install
cd ../client && npm install
```

3. **Environment Variables Setup**

```bash
# Create client/.env file
cp client/env.example client/.env
# Enter Firebase configuration
```

4. **Start Development Server**

```bash
# Frontend
cd client && npm run dev

# Firebase Functions (separate terminal)
cd functions && npm run serve
```

## 📁 Project Structure

```
EnglishConvoCoach/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── contexts/       # React Context
│   │   ├── hooks/          # Custom Hooks
│   │   ├── lib/           # Utilities and Config
│   │   └── pages/         # Page Components
│   └── dist/              # Build Output
├── functions/             # Firebase Functions
│   ├── src/
│   │   ├── routes/        # API Routes
│   │   ├── services/      # Business Logic
│   │   └── middleware/    # Middleware
│   └── lib/              # Compiled Functions
├── public/               # Static Files
└── server_backup/        # Legacy Express Server (Backup)
```

## 🔧 Key Features

### 1. English Conversation Practice

- **Original Chat**: Basic conversation practice
- **AI Conversation**: Free conversation with AI
- **Friends Script**: TV series dialogue practice

### 2. Expression Management

- Add/Edit/Delete expressions by category
- Track usage frequency and accuracy

### 3. Progress Tracking

- Practice session statistics
- Achievement system
- Learning progress visualization

### 4. User Authentication

- Email/Password login
- Google login
- Profile management

## 🚀 Deployment

### Automated Deployment (GitHub Actions)

- Automatic deployment on push to `main` branch
- Simultaneous deployment of Firebase Functions and Hosting

### Manual Deployment

```bash
# Deploy Functions
firebase deploy --only functions

# Deploy Hosting
firebase deploy --only hosting

# Deploy All
firebase deploy
```

## 🔐 Environment Variables

### Firebase Configuration

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=https://us-central1-your_project.cloudfunctions.net/api
```

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
