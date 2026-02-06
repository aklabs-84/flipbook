📄 1. 제품 요구사항 문서 (PRD)
서비스 명: aklabs Flipbook Pro 목표: 누구나 고품질의 3D 인터랙티브 플립북을 제작, 관리, 공유할 수 있는 SaaS 플랫폼 구축

🎯 주요 기능 (User Stories)

고급 편집기: 사용자는 이미지/영상뿐만 아니라 텍스트 레이어를 추가하고 배치할 수 있다. 

PDF 변환: 사용자는 PDF 파일을 업로드하여 자동으로 플립북 페이지를 생성할 수 있다.

반응형 뷰어: 기기 환경(모바일, 태블릿, PC)에 관계없이 최적화된 크기로 책을 볼 수 있다.

클라우드 관리: 사용자는 자신의 프로젝트를 대시보드에서 관리하고 서버에 저장할 수 있다.


공유 및 보안: 고유 링크로 결과물을 공유하고, 필요시 비밀번호를 설정할 수 있다. 


몰입형 UX: 실제 종이 소리와 부드러운 3D 애니메이션을 제공한다. 

💻 2. 기술 요구사항 문서 (TRD)
🛠 Tech Stack
Frontend: React.js, Tailwind CSS (스타일), Framer Motion (UI 애니메이션)

Backend/DB: Supabase (PostgreSQL, Auth, Storage)

Hosting: Vercel (GitHub 연동 자동 배포)

Libraries: pdfjs-dist (PDF 렌더링), lucide-react (아이콘)

🏗 시스템 아키텍처

3D 엔진: 기존 CSS preserve-3d 및 rotateY 로직을 React 컴포넌트로 이식한다. 


상태 관리: Zustand 또는 React Context를 사용하여 전체 프로젝트 설정(isRtl, pageData)을 전역 관리한다. 


데이터 저장: * Storage: 미디어 파일(이미지, 영상, BGM) 저장 및 공개 URL 생성. 

Database: 페이지별 메타데이터(텍스트 위치, 레이아웃 정보)를 JSONB 형식으로 저장.

🔒 보안 및 성능
Lazy Loading: 많은 페이지가 있을 경우 현재 보고 있는 페이지 근처만 로드하여 성능 최적화.

Rls (Row Level Security): Supabase 권한 설정을 통해 본인의 프로젝트만 수정 가능하도록 제한.

📝 3. 작업 목록 (Task List)
Phase 1: 기반 구축 (Foundation)
[ ] 깃허브 저장소 생성 및 Vercel 초기 배포 설정

[ ] Supabase 프로젝트 생성 및 Database Schema 정의

[ ] React 프로젝트 환경 설정 (Tailwind, Lucide 등 설치)

Phase 2: 코어 엔진 개발 (Core 3D Engine)
[ ] 기존 3D 플립북 로직을 React Page 컴포넌트로 변환 

[ ] currentLeaf 상태 기반의 페이지 넘김 로직 구현 

[ ] [신규] 브라우저 창 크기에 따른 scale 계산(반응형) 기능 추가

Phase 3: 편집 도구 고도화 (Advanced Editor)
[ ] 드래그 앤 드롭 미디어 업로드 기능 구현 

[ ] [신규] 텍스트 레이어 에디터(위치 드래그, 폰트 조절) 개발

[ ] [신규] pdf.js를 이용한 PDF → 이미지 변환 파이프라인 구축

[ ] 레이아웃 프리셋(이미지+텍스트 혼합) 시스템 개발 

Phase 4: 클라우드 연동 (Cloud Integration)
[ ] Supabase Auth를 이용한 로그인/가입 기능

[ ] 프로젝트 저장/불러오기 기능 (Save to DB)

[ ] 공유용 읽기 전용 뷰어 페이지(/viewer/:id) 개발

Phase 5: 디테일 및 폴리싱 (Visual Polish)
[ ] 페이지 각도에 따른 동적 그림자(box-shadow) 적용 

[ ] BGM 및 효과음 재생 로직 최적화 

[ ] UI 가독성 개선 (클린 모드 고도화)