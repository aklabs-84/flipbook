# 📖 Flipbook Pro (플립북 프로)

**당신의 상상력을 현실로 만드는 AI 기반 플립북 제작 플랫폼**

Flipbook Pro는 정적인 PDF 문서나 단순한 이미지를 실제 책을 넘기는 듯한 경험을 주는 '인터랙티브 플립북'으로 변환해주는 웹 애플리케이션입니다.
Google/Kakao 로그인을 지원하며, 사용자는 자신만의 디지털 책을 만들고, 공유하고, 전시할 수 있습니다.

![Flipbook Pro Hero](/public/assets/book_festival_hero.png)

## ✨ 주요 기능 (Key Features)

### 1. 📚 스마트한 플립북 생성
- **PDF 변환**: 가지고 있는 PDF 파일을 드래그 한 번으로 플립북으로 변환합니다.
- **빈 페이지에서 시작**: 백지 상태에서 자유롭게 페이지를 구성할 수 있습니다.
- **WebP 자동 최적화**: 업로드하는 모든 이미지는 자동으로 WebP 형식으로 변환되어 빠르고 가볍습니다.

### 2. 🎨 강력한 커스터마이징
- **나만의 커버 디자인**: 원하는 이미지를 업로드하여 책 표지를 꾸밀 수 있습니다.
- **공개/비공개 설정**: 나만 보고 싶은 책은 비밀번호를 걸어 보호할 수 있습니다.
- **다양한 테마**: 동화 같은 느낌부터 모던한 스타일까지 다양한 분위기를 연출합니다.

### 3. 🖼 상상 전시관 (Gallery)
- 다른 유저들이 만든 멋진 플립북을 감상할 수 있습니다.
- 로그인 없이도 표지 구경이 가능하며, 로그인을 하면 내용을 볼 수 있습니다.

### 4. 🛠 편리한 대시보드 (My Studio)
- 내가 만든 모든 프로젝트를 한눈에 관리합니다.
- 제목 수정, 커버 변경, 삭제 등의 관리가 용이합니다.

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS
- **State Management**: Zustand
- **Database & Auth**: Supabase (PostgreSQL)
- **PDF Processing**: PDF.js
- **Deployment**: Vercel

## 🚀 시작하기 (Getting Started)

### 설치 및 실행

```bash
# 레포지토리 클론
git clone https://github.com/aklabs-84/flipbook.git

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

### 환경 변수 설정 (.env)

프로젝트 루트에 `.env` 파일을 생성하고 다음 값을 채워주세요.

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📝 라이선스

This project is licensed under the MIT License.
