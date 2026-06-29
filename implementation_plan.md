# Next.js 디자인 전면 교정 계획 (index.html 원본 일치화)

`index.html` 파일에 정의된 레이아웃, CSS 클래스, Tailwind 유틸리티 클래스 등을 현재 분리된 Next.js 컴포넌트들에 100% 동일하게 반영하는 마이그레이션 세부 계획입니다. 

## 1. 개요 및 배경
- 기존에 작성된 `index.html`은 토스(Toss) 스타일과 각종 마이크로 애니메이션, 세밀한 CSS 튜닝(사이드바/하단바 아이콘 하이라이트 등)이 완벽하게 적용되어 있었습니다.
- Next.js로 마이그레이션하면서 일부 컴포넌트 분리 과정 중 추가된 불필요한 코드(예: 사이드바의 검사실 필터 등)를 제거하고, 원본의 `className`과 HTML 구조를 그대로 복원합니다.

## 2. 변경 대상 파일 및 세부 작업

### [MODIFY] `app/globals.css`
- `index.html` 상단 `<style>` 태그에 있던 전역 CSS(`.sidebar-menu-item`, `.bottom-nav-item`, `.spinner`, `fade-enter`, `fade-exit` 등)가 Next.js의 `globals.css`와 100% 일치하는지 검증하고 누락된 속성을 병합합니다.

### [MODIFY] `components/layout/Sidebar.tsx`
- **구조 복원**: 현재 Next.js 사이드바에 임의로 추가된 "검사실 필터" 리스트를 삭제하고, `index.html`의 하단 사용자 정보 영역 디자인(주황색 유저 아이콘 등)을 동일하게 복원합니다.
- **메뉴 스타일 복원**: `.sidebar-menu-item` 클래스를 그대로 사용하며, 공지사항(3)과 의료장비(!) 배지를 `index.html`과 똑같은 디자인과 위치로 렌더링합니다.

### [MODIFY] `components/layout/BottomNav.tsx`
- **스타일 복원**: `bottom-nav-item` 클래스를 적용하고, 활성화되었을 때 아이콘만 주황색(`color: #ff7a00`)으로 변하고 글씨는 회색을 유지하도록 원본 CSS 체계와 맞춥니다.
- **배지 복원**: 공지사항 및 의료장비 탭 우측 상단에 표시되는 미니 배지를 동일하게 복원합니다.

### [MODIFY] `components/layout/Header.tsx`
- **스타일 복원**: 상단 헤더의 타이틀, 알림 종 모양 아이콘(빨간 점 포함), 우측 사용자 프로필 디자인을 원본 `index.html`의 `<header>` 부분과 100% 일치하게 교정합니다.

### [MODIFY] `components/pages/Dashboard.tsx`
- **구조 복원**: 원본의 "로그인 성공!" 메시지, "시스템 정상 가동 중" 배지, 그리고 4개의 미니 카드(공지사항, 인수인계, 장비 알림, 나의 할 일) 그리드 레이아웃을 그대로 복원합니다.
- **배너 복원**: 미서명 인수인계 알림 주황색 배너 레이아웃을 동일하게 맞춥니다.

### [MODIFY] `components/pages/Notices.tsx`
- **필터 및 리스트 복원**: `index.html`의 `updateFilterUI()` 및 `renderNotices()` 함수에 정의된 HTML 구조(미니 카드 슬림 그리드 필터, 새 공지 알림 배지 등)를 React 컴포넌트로 완벽히 포팅합니다.

### [MODIFY] `components/pages/Handovers.tsx` & `Equipment.tsx`
- **레이아웃 및 검색바**: 상단 타이틀, 검색창, 총 N건 뱃지 구조를 일치시킵니다.
- **카드 디자인**: 인수인계 카드(서명 인풋, 버튼 등)와 의료장비 카드(상태 뱃지, 상태 전환 버튼, MIS 체크박스 등)의 HTML 구조 및 Tailwind 클래스를 원본과 동일하게 복제합니다.

### [MODIFY] `components/pages/Stats.tsx`
- **차트 및 통계 레이아웃**: 연간 누적 고장 스코어보드, 상태별 미니 카드 3열, 막대그래프 뼈대, 검사실별 연간 누적 순위 HTML 구조를 `index.html`의 `renderEquipmentStats()` 함수 내 HTML과 동일하게 구축합니다.

## 3. 검증 계획
- Next.js 개발 서버(`http://localhost:3001`)에서 모든 탭을 순회하며 원본 `index.html`과 시각적 차이(여백, 폰트 굵기, 색상 등)가 없는지 교차 검증합니다.
- 토스 스타일의 탭 클릭 애니메이션(`active:scale-95` 등)이 올바르게 작동하는지 확인합니다.

---

> [!IMPORTANT]
> 원본 `index.html`의 디자인과 100% 동일하게 모든 컴포넌트의 레이아웃과 CSS를 전면 교체합니다. 위 계획에 동의하시면 **승인**해 주시기 바랍니다. 승인 즉시 모든 파일의 코드를 수정하겠습니다.
