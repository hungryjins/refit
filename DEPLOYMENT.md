# Daily Convo - AWS Deployment Guide

## Domain Configuration
- **Domain**: dailyconvo.com
- **Deployment Platform**: AWS (not Replit)
- **Authentication**: Firebase Google Sign-in required

## Firebase Console Configuration

### 1. Authentication Setup
- Go to Firebase Console → Authentication → Sign-in method
- Enable Google provider
- Add authorized domains:
  - `dailyconvo.com`
  - `www.dailyconvo.com`
  - Your AWS hosting domain (e.g., CloudFront distribution)

### 2. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Only authenticated users can access data
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Environment Variables for AWS
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
NODE_ENV=production
```

## AWS Deployment Architecture

### Option 1: EC2 + CloudFront
- EC2 instance running Node.js server
- CloudFront for CDN and SSL
- Route 53 for DNS management

### Option 2: ECS + ALB
- ECS Fargate for containerized deployment
- Application Load Balancer
- CloudFront for CDN

### Option 3: Amplify Hosting
- AWS Amplify for full-stack deployment
- Automatic CI/CD from Git repository
- Built-in SSL and CDN

## Build Commands
```bash
# Production build
npm run build

# Start production server
npm start
```

## Required AWS Services
- Route 53 (DNS)
- CloudFront (CDN + SSL)
- EC2/ECS/Amplify (Hosting)
- Certificate Manager (SSL certificate)

## Firebase Setup Checklist
- [ ] Enable Google Authentication
- [ ] Add dailyconvo.com to authorized domains
- [ ] Set authentication-based security rules
- [ ] Configure environment variables
- [ ] Test authentication flow

## Post-Deployment Steps
1. Update Firebase authorized domains
2. Verify Google sign-in works on production domain
3. Test Firestore data persistence
4. Monitor authentication and database usage