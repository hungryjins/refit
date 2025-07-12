# Daily Convo - AWS 배포 단계별 가이드

## 1단계: dailyconvo.com 도메인 구입 및 설정

### A. 도메인 구입 (Route 53 또는 외부)
```
1. AWS Console → Route 53 → 도메인 등록
2. dailyconvo.com 검색 후 구입
3. 또는 기존 도메인 등록업체에서 구입 후 Route 53으로 이전
```

### B. DNS 설정
```
1. Route 53에서 호스팅 영역 생성
2. 네임서버 확인 및 도메인에 적용
```

## 2단계: AWS Amplify로 간단 배포 (추천)

### A. GitHub 저장소 준비
```bash
# 로컬에서 Git 저장소 초기화
git init
git add .
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/yourusername/daily-convo.git
git push -u origin main
```

### B. Amplify 앱 생성
```
1. AWS Console → Amplify → 새 앱 생성
2. GitHub 연결 및 저장소 선택
3. 빌드 설정:
   - Build command: npm run build
   - Base directory: /
   - Publish directory: dist/public
```

### C. 환경 변수 설정
```
Amplify Console → 환경 변수에 추가:
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id  
VITE_FIREBASE_APP_ID=your_app_id
NODE_ENV=production
```

### D. 도메인 연결
```
1. Amplify → 도메인 관리 → 사용자 지정 도메인 추가
2. dailyconvo.com 입력
3. SSL 인증서 자동 생성 대기
```

## 3단계: Firebase 설정

### A. Authentication 설정
```
1. Firebase Console → Authentication → Sign-in method
2. Google 제공업체 활성화
3. 승인된 도메인에 추가:
   - dailyconvo.com
   - www.dailyconvo.com
   - Amplify 임시 도메인 (예: abc123.amplifyapp.com)
```

### B. Firestore 보안 규칙
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 4단계: 프로덕션 빌드 최적화

### A. package.json 스크립트 확인
```json
{
  "scripts": {
    "build": "vite build && tsc && vite build --ssr",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

### B. Amplify 빌드 설정 (amplify.yml)
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist/public
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## 5단계: 배포 확인 체크리스트

### 배포 전
- [ ] Firebase 프로젝트 설정 완료
- [ ] 환경 변수 모두 설정
- [ ] GitHub 저장소 연결
- [ ] 도메인 DNS 설정

### 배포 후
- [ ] https://dailyconvo.com 접속 확인
- [ ] Google 로그인 정상 작동
- [ ] 표현 추가/수정 기능 테스트
- [ ] 대화 연습 기능 테스트
- [ ] 모바일 반응형 확인

## 비용 예상
- **Route 53**: $12/년 (도메인)
- **Amplify**: $1-5/월 (트래픽에 따라)
- **Firebase**: 무료 (소규모 사용량)
- **총 예상 비용**: $15-75/년

## 문제 해결
- 빌드 실패 시: 로그 확인 후 dependencies 검토
- 도메인 연결 안 됨: DNS 전파 대기 (최대 48시간)
- 로그인 안 됨: Firebase 승인된 도메인 확인

## 다음 단계
배포가 완료되면 Google Analytics, 모니터링, 백업 설정을 추천합니다.