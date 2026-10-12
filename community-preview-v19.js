/* PARTY guild - main page community photo preview (V19).
   Public read-only preview. No login required; no writes to Firestore or Storage.
*/
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import { getStorage, ref, getDownloadURL } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',
  authDomain: 'party-guild.firebaseapp.com',
  projectId: 'party-guild',
  storageBucket: 'party-guild.firebasestorage.app',
  messagingSenderId: '465332308360',
  appId: '1:465332308360:web:50b5663dc1563df3d6923d'
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const grid = document.getElementById('portalGalleryGrid');
const guide = document.getElementById('portalGalleryGuide');
const count = document.getElementById('portalGalleryCount');

function setCount(message) {
  if (count) count.textContent = message;
}

function createPhotoCard(record) {
  const data = record.data();
  const title = String(data.title || '문파 활동 기록');
  const authorUid = typeof data.authorUid === 'string' ? data.authorUid : '';

  const card = document.createElement('a');
  card.href = 'community.html';
  card.className = 'portal-gallery-item';
  card.setAttribute('aria-label', title + ' · 커뮤니티에서 보기');

  const placeholder = document.createElement('div');
  placeholder.textContent = '📸';
  placeholder.style.cssText = 'display:flex;align-items:center;justify-content:center;aspect-ratio:16/10;background:linear-gradient(135deg,#263858,#161e35);color:#ebc78d;font-size:30px';
  card.append(placeholder);

  const caption = document.createElement('span');
  caption.textContent = title;
  card.append(caption);

  if (authorUid) {
    const picture = document.createElement('img');
    picture.alt = title;
    picture.loading = 'lazy';
    picture.style.display = 'none';
    picture.addEventListener('load', () => {
      placeholder.remove();
      picture.style.display = 'block';
    });
    picture.addEventListener('error', () => picture.remove());
    card.insertBefore(picture, caption);

    // The V18 uploader saves exactly this Storage path.
    const path = 'community/' + authorUid + '/' + record.id + '/image.webp';
    getDownloadURL(ref(storage, path))
      .then(url => { picture.src = url; })
      .catch(error => {
        picture.remove();
        console.info('활동 사진 URL 확인 실패 (' + record.id + '):', error?.code || error);
      });
  }
  return card;
}

async function loadCommunityPreview() {
  if (!grid) return;
  setCount('최근 활동 확인 중…');
  try {
    const result = await getDocs(query(
      collection(db, 'communityPosts'),
      orderBy('createdAt', 'desc'),
      limit(6)
    ));

    if (result.empty) {
      setCount('사진·댓글 남기기 ↗');
      if (guide) guide.hidden = false;
      return;
    }

    // Firestore is the same collection used by community-v18.js.
    grid.replaceChildren(...result.docs.map(createPhotoCard));
    if (guide) guide.hidden = true;
    setCount('최근 활동 ' + result.size + '개 ↗');
  } catch (error) {
    console.error('문파 커뮤니티 미리보기 조회 실패:', error);
    setCount('커뮤니티에서 확인 ↗');
    if (guide) {
      guide.hidden = false;
      guide.firstChild && (guide.firstChild.textContent = '활동 사진을 불러오지 못했어요. ');
    }
  }
}
loadCommunityPreview();
