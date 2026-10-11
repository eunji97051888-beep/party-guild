파티 문파 홈페이지 V4 - GitHub Pages 전용 / Firebase 불필요

1. 이 ZIP의 압축을 풀고, 안의 파일 전부를 기존 party-guild GitHub 저장소의 최상위 폴더에 업로드합니다.
2. Add file -> Upload files -> 파일 모두 선택 -> Commit changes.
3. 기존 GitHub Pages 주소에서 Ctrl+F5 새로고침합니다. 저장소를 새로 만들 필요는 없습니다.

구성:
index.html / style.css / app.js - 메인 페이지
party-banner.png - 문파 홍보 이미지(도깨비의세계 문파 / 함께 즐기고 웃는 우리 문파)
desktop-bg.png - 보내주신 두 번째 성문 배경 원본 (PC에만 사용)
weekly.png - 게임 주간 플래너 원본
data.js - 반복 일정 및 공지 데이터
admin.html, admin-style.css, editor.js - 기존 무료 수동 관리자 도구
videos.js - 추천 유튜브 영상 목록

관리자 편집은 관리자 페이지(admin.html)에서 data.js 또는 weekly.png 파일을 다운로드한 후 GitHub에 직접 업로드해야 문파원에게 반영됩니다. 서버 실시간 저장 기능은 없습니다.
유튜브는 videos.js의 PARTY_VIDEOS 배열에 실제 영상의 11글자 YouTube ID와 제목을 넣고 재업로드하면 사이트에서 썸네일과 링크를 표시합니다. 잘못된 예시나 가짜 영상은 넣지 않았습니다.

PC 배경은 원본 이미지 그대로 사용. 모바일에서는 배경을 숨겨 가독성 유지.
외부 서비스 API나 결제 불필요. 공개 저장소이므로 개인 비밀번호/비밀키를 업로드하지 마세요.
기존 firebase 관련 파일은 이 ZIP에 포함하지 않았습니다. GitHub에 기존 파일이 남아 있더라도 메인 웹사이트에선 사용하지 않습니다.
