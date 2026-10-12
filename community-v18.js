import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { getFirestore, doc, getDoc, addDoc, getDocs, deleteDoc, collection, query, orderBy, limit, startAfter, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-storage.js';

const config = {
  apiKey: 'AIzaSyD_JzuNnKKuc-NU26KatxO2jqZCUVAebPE',
  authDomain: 'party-guild.firebaseapp.com',
  projectId: 'party-guild',
  storageBucket: 'party-guild.firebasestorage.app',
  messagingSenderId: '465332308360',
  appId: '1:465332308360:web:50b5663dc1563df3d6923d'
};
const ADMIN_UID = 'KkmihHrjJ3X82JLrdzymrkEUZyE3';
const app = getApps().length ? getApp() : initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const el = (id) => document.getElementById(id);
const perPage = 9;
let user = null;
let approved = false;
let alias = '';
let current = null;
let page = 0;
let pageCursors = [null];
let nextCursor = null;
let loading = false;

function status(id, message, error = false) {
  const target = el(id);
  target.textContent = message;
  target.style.color = error ? '#ffaaaa' : '#bce8b5';
}
function visible(id, yes) {
  el(id).classList.toggle('hidden', !yes);
}
function nickname(data) {
  return String(data.authorName || '문파원');
}
function readableTime(value) {
  return value && typeof value.toDate === 'function' ? value.toDate().toLocaleString('ko-KR') : '방금 전';
}
function imagePath(uid, postId) {
  return 'community/' + uid + '/' + postId + '/image.webp';
}
function showImage(target, uid, postId, fallback) {
  const path = imagePath(uid, postId);
  getDownloadURL(ref(storage, path)).then((url) => {
    target.src = url;
    target.classList.remove('hidden');
  }).catch(() => {
    if (fallback) fallback();
  });
}

const loginButton = el('login');
loginButton.addEventListener('click', async () => {
  loginButton.disabled = true;
  status('authStatus', 'Google 로그인 창을 여는 중...');
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    status('authStatus', '로그인 실패 (' + (error.code || 'unknown') + '): ' + (error.message || String(error)), true);
  } finally {
    loginButton.disabled = false;
  }
});
el('logout').addEventListener('click', () => {
  signOut(auth).catch((error) => status('authStatus', error.message, true));
});
el('copyUid').addEventListener('click', async () => {
  if (!user) return;
  try {
    await navigator.clipboard.writeText(user.uid);
    status('authStatus', 'UID를 복사했어요. 문주에게 보내 승인받아 주세요.');
  } catch {
    status('authStatus', 'UID: ' + user.uid);
  }
});

onAuthStateChanged(auth, async (signedInUser) => {
  user = signedInUser;
  approved = false;
  alias = '';
  visible('login', !user);
  visible('logout', !!user);
  visible('copyUid', !!user);
  el('who').textContent = user ? '로그인: ' + (user.email || user.uid) : '비로그인 방문자 · 게시글 열람 가능';
  if (user) {
    if (user.uid === ADMIN_UID) {
      approved = true;
      alias = '문주';
    } else {
      try {
        const snap = await getDoc(doc(db, 'communityMembers', user.uid));
        approved = snap.exists() && snap.data().approved === true;
        alias = approved ? snap.data().name : '';
      } catch (error) {
        status('authStatus', '권한 확인 실패: ' + error.message, true);
      }
    }
  }
  visible('composer', approved);
  visible('commentForm', approved && !!current);
  el('commentHelp').textContent = approved ? '댓글을 작성할 수 있어요.' : '승인된 문파원만 댓글을 작성할 수 있어요.';
  if (!user) status('authStatus', 'Google 로그인 후 UID를 문주에게 보내 승인받아 주세요.');
  else if (approved) status('authStatus', '✅ 문파원 인증 완료 · 글과 댓글을 작성할 수 있어요.');
  else status('authStatus', '승인 대기 중입니다. 내 UID 복사 → 문주에게 전달해 주세요.');
  if (current) await openPost(current.id);
}, (error) => status('authStatus', '인증 상태 확인 실패: ' + error.message, true));

async function compressPhoto(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('JPG, PNG, WEBP 사진만 등록할 수 있어요.');
  if (file.size > 15 * 1024 * 1024) throw new Error('원본 사진은 15MB 이하만 가능해요.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.85;
  let blob = null;
  while (quality >= 0.25) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob && blob.size <= 2 * 1024 * 1024) break;
    quality -= 0.15;
  }
  if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('사진 압축에 실패했어요. 다른 사진을 선택해 주세요.');
  return blob;
}

el('postForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!user || !approved) return;
  const title = el('postTitle').value.trim();
  const body = el('postBody').value.trim();
  const file = el('postImage').files[0];
  if (!title || !body) return;
  const button = el('postSubmit');
  button.disabled = true;
  let createdPost = null;
  let uploadedPath = null;
  try {
    let photo = null;
    if (file) {
      status('postStatus', '사진을 압축하고 있어요...');
      photo = await compressPhoto(file);
    }
    status('postStatus', '게시글을 저장하고 있어요...');
    createdPost = await addDoc(collection(db, 'communityPosts'), {
      title, body, authorUid: user.uid, authorName: alias || '문파원',
      imagePath: '', createdAt: serverTimestamp()
    });
    if (photo) {
      uploadedPath = imagePath(user.uid, createdPost.id);
      await uploadBytes(ref(storage, uploadedPath), photo, { contentType: 'image/webp' });
    }
    el('postForm').reset();
    status('postStatus', '✅ 게시글이 등록됐어요.');
    page = 0;
    pageCursors = [null];
    await loadPosts();
  } catch (error) {
    status('postStatus', '게시글 저장 실패: ' + error.message, true);
    if (createdPost) {
      try { await deleteDoc(createdPost); } catch { /* 원본 오류 메시지를 유지 */ }
    }
    if (uploadedPath) {
      try { await deleteObject(ref(storage, uploadedPath)); } catch { /* 업로드 실패 시 파일이 없을 수 있음 */ }
    }
  } finally {
    button.disabled = false;
  }
});

async function loadPosts() {
  if (loading) return;
  loading = true;
  const root = el('postGrid');
  root.textContent = '게시글을 불러오는 중...';
  try {
    const clauses = [orderBy('createdAt', 'desc'), limit(perPage + 1)];
    if (page > 0 && pageCursors[page]) clauses.unshift(startAfter(pageCursors[page]));
    const snap = await getDocs(query(collection(db, 'communityPosts'), ...clauses));
    const shown = snap.docs.slice(0, perPage);
    nextCursor = snap.docs.length > perPage ? shown[shown.length - 1] : null;
    root.replaceChildren();
    for (const record of shown) {
      const data = record.data();
      const card = document.createElement('article');
      card.className = 'post';
      card.tabIndex = 0;
      const picture = document.createElement('img');
      picture.alt = data.title || '문파 활동 사진';
      picture.loading = 'lazy';
      picture.className = 'hidden';
      const placeholder = document.createElement('div');
      placeholder.className = 'empty';
      placeholder.textContent = '📷';
      card.append(picture, placeholder);
      showImage(picture, data.authorUid, record.id, () => {
        picture.remove();
      });
      picture.addEventListener('load', () => placeholder.remove());
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = data.title || '제목 없음';
      const details = document.createElement('small');
      details.textContent = nickname(data) + ' · ' + readableTime(data.createdAt);
      info.append(title, details);
      card.append(info);
      card.addEventListener('click', () => openPost(record.id));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') openPost(record.id);
      });
      root.append(card);
    }
    if (!shown.length) root.textContent = '아직 등록된 활동 기록이 없어요. 첫 번째 추억을 남겨 주세요.';
    el('postCount').textContent = '이 페이지 ' + shown.length + '개';
    el('pageNo').textContent = (page + 1) + ' 페이지';
    el('prev').disabled = page === 0;
    el('next').disabled = !nextCursor;
  } catch (error) {
    root.textContent = '게시글 불러오기 실패: ' + error.message;
  } finally {
    loading = false;
  }
}

el('prev').addEventListener('click', () => {
  if (page <= 0) return;
  page -= 1;
  loadPosts();
});
el('next').addEventListener('click', () => {
  if (!nextCursor) return;
  pageCursors[page + 1] = nextCursor;
  page += 1;
  loadPosts();
});

async function openPost(postId) {
  try {
    const snap = await getDoc(doc(db, 'communityPosts', postId));
    if (!snap.exists()) {
      visible('detail', false);
      return;
    }
    current = { id: postId, ...snap.data() };
    visible('detail', true);
    el('detailTitle').textContent = current.title;
    el('detailMeta').textContent = nickname(current) + ' · ' + readableTime(current.createdAt);
    el('detailBody').textContent = current.body;
    const photo = el('detailImage');
    photo.classList.add('hidden');
    showImage(photo, current.authorUid, postId);
    visible('deletePost', !!user && (user.uid === ADMIN_UID || (approved && user.uid === current.authorUid)));
    visible('commentForm', approved);
    el('commentHelp').textContent = approved ? '' : '승인된 문파원만 댓글을 작성할 수 있어요.';
    await loadComments();
    el('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    status('commentStatus', '게시글 조회 실패: ' + error.message, true);
  }
}
el('closeDetail').addEventListener('click', () => {
  visible('detail', false);
  current = null;
});
el('deletePost').addEventListener('click', async () => {
  if (!current || !user || !confirm('게시글과 댓글을 삭제할까요? 이 작업은 되돌릴 수 없어요.')) return;
  try {
    const postId = current.id;
    const authorUid = current.authorUid;
    const snap = await getDocs(collection(db, 'communityPosts', postId, 'comments'));
    for (const record of snap.docs) await deleteDoc(record.ref);
    await deleteDoc(doc(db, 'communityPosts', postId));
    try { await deleteObject(ref(storage, imagePath(authorUid, postId))); } catch { /* 사진이 없을 수 있음 */ }
    current = null;
    visible('detail', false);
    page = 0;
    pageCursors = [null];
    await loadPosts();
  } catch (error) {
    status('commentStatus', '게시글 삭제 실패: ' + error.message, true);
  }
});

async function loadComments() {
  if (!current) return;
  const root = el('comments');
  root.textContent = '댓글을 불러오는 중...';
  try {
    const snap = await getDocs(query(collection(db, 'communityPosts', current.id, 'comments'), orderBy('createdAt', 'asc'), limit(100)));
    root.replaceChildren();
    snap.forEach((record) => {
      const data = record.data();
      const box = document.createElement('div');
      box.className = 'comment';
      const meta = document.createElement('small');
      meta.textContent = nickname(data) + ' · ' + readableTime(data.createdAt);
      const body = document.createElement('p');
      body.textContent = data.body;
      box.append(meta, body);
      if (user && (user.uid === ADMIN_UID || (approved && user.uid === data.authorUid))) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn alt';
        button.textContent = '댓글 삭제';
        button.addEventListener('click', async () => {
          if (!confirm('댓글을 삭제할까요?')) return;
          try {
            await deleteDoc(record.ref);
            await loadComments();
          } catch (error) {
            status('commentStatus', '댓글 삭제 실패: ' + error.message, true);
          }
        });
        box.append(button);
      }
      root.append(box);
    });
    if (snap.empty) root.textContent = '아직 댓글이 없어요. 첫 댓글을 남겨 주세요.';
  } catch (error) {
    root.textContent = '댓글 불러오기 실패: ' + error.message;
  }
}
el('commentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!current || !approved || !user) return;
  const body = el('commentText').value.trim();
  if (!body) return;
  const button = el('commentSubmit');
  button.disabled = true;
  try {
    await addDoc(collection(db, 'communityPosts', current.id, 'comments'), {
      body, authorUid: user.uid, authorName: alias || '문파원', createdAt: serverTimestamp()
    });
    el('commentText').value = '';
    status('commentStatus', '댓글 등록 완료');
    await loadComments();
  } catch (error) {
    status('commentStatus', '댓글 등록 실패: ' + error.message, true);
  } finally {
    button.disabled = false;
  }
});

loadPosts();
window.dispatchEvent(new Event('partyCommunityReady'));
