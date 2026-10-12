import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { getFirestore, doc, collection, getDocs, setDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

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
const element = (id) => document.getElementById(id);
let currentUser = null;

function status(message, error = false) {
  element('adminStatus').textContent = message;
  element('adminStatus').style.color = error ? '#ffaaaa' : '#bce8b5';
}
function show(id, visible) {
  element(id).classList.toggle('hidden', !visible);
}

const loginButton = element('adminLogin');
loginButton.addEventListener('click', async () => {
  loginButton.disabled = true;
  status('Google 로그인 창을 여는 중...');
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    status('로그인 오류 (' + (error.code || 'unknown') + '): ' + (error.message || String(error)), true);
  } finally {
    loginButton.disabled = false;
  }
});
element('adminLogout').addEventListener('click', () => {
  signOut(auth).catch((error) => status('로그아웃 실패: ' + error.message, true));
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  const isAdmin = !!user && user.uid === ADMIN_UID;
  show('adminLogin', !user);
  show('adminLogout', !!user);
  show('adminOnly', isAdmin);
  if (!user) {
    status('문주 Google 계정으로 로그인해 주세요.');
  } else if (isAdmin) {
    status('✅ 문주 권한 확인 완료');
    await loadMembers();
  } else {
    status('현재 로그인한 Google 계정에는 문주 권한이 없어요.', true);
  }
}, (error) => status('인증 상태 확인 실패: ' + error.message, true));

element('memberForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.uid !== ADMIN_UID) return;
  const name = element('memberName').value.trim();
  const uid = element('memberUid').value.trim();
  if (!name || name.length > 40 || uid.length < 10 || uid.length > 128 || uid.includes('/') || uid === ADMIN_UID) {
    status('문파 닉네임과 Firebase UID를 다시 확인해 주세요.', true);
    return;
  }
  const button = element('memberSave');
  button.disabled = true;
  try {
    await setDoc(doc(db, 'communityMembers', uid), {
      name, approved: true, updatedAt: serverTimestamp(), updatedBy: currentUser.uid
    });
    element('memberForm').reset();
    status('✅ 문파원 승인 완료');
    await loadMembers();
  } catch (error) {
    status('승인 저장 실패: ' + error.message, true);
  } finally {
    button.disabled = false;
  }
});

async function loadMembers() {
  const list = element('memberList');
  list.textContent = '승인된 문파원 불러오는 중...';
  try {
    const snap = await getDocs(collection(db, 'communityMembers'));
    element('memberCount').textContent = snap.size + '명';
    list.replaceChildren();
    snap.forEach((record) => {
      const info = record.data();
      const box = document.createElement('div');
      box.className = 'admin-record';
      const name = document.createElement('b');
      name.textContent = info.name;
      const uid = document.createElement('code');
      uid.textContent = record.id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn warn';
      button.textContent = '승인 회수';
      button.addEventListener('click', async () => {
        if (!confirm(info.name + ' 문파원의 작성 권한을 회수할까요?')) return;
        try {
          await deleteDoc(record.ref);
          status('권한 회수 완료');
          await loadMembers();
        } catch (error) {
          status('권한 회수 실패: ' + error.message, true);
        }
      });
      box.append(name, uid, button);
      list.append(box);
    });
    if (snap.empty) list.textContent = '아직 승인한 문파원이 없어요.';
  } catch (error) {
    list.textContent = '목록 읽기 실패: ' + error.message;
  }
}
