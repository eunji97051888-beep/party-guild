/* PARTY verified skill-build editor: authenticated Firestore publishing, GitHub backup only. */
import {db,definitions,isAdmin,login,waitAuth,read,runTransaction,serverTimestamp,validate,save} from './party-content-cloud-core.js';
const $=id=>document.getElementById(id);
const deep=value=>JSON.parse(JSON.stringify(value));
const initial=deep(Array.isArray(window.PARTY_VERIFIED_BUILDS)?window.PARTY_VERIFIED_BUILDS:[]);
let posts=deep(initial),selectedId=null,image='',revision=null,busy=false,blocked=false;
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const msg=(text,error=false)=>{for(const id of ['status','cloudStatus']){const el=$(id);if(el){el.textContent=text;el.style.color=error?'#ffaaa5':'#bee8bd'}}};
function buttons(){const edit=isAdmin()&&revision!==null&&!blocked&&!busy;
 for(const id of ['title','date','body','image','savePost','deletePost','newPost','removeImage'])$(id).disabled=!edit;
 $('cloudLogin').disabled=busy;$('cloudReload').disabled=busy;$('cloudInit').hidden=revision!==null||!isAdmin()||blocked;
 $('cloudInit').disabled=busy;
}
function preview(){const img=$('imgPreview');if(image){img.src=image;img.style.display='block'}else{img.removeAttribute('src');img.style.display='none'}}
function renderList(){const list=$('postList');list.replaceChildren();if(!posts.length){const t=document.createElement('p');t.className='muted';t.textContent='아직 등록된 도술빌드가 없어.';list.append(t)}
 const sorted=posts.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||'')));
 for(const p of sorted){const b=document.createElement('button');b.type='button';b.textContent=`${p.date||''} · ${p.title||''}`;b.setAttribute('aria-current',String(selectedId===p.id));b.disabled=!isAdmin()||revision===null||busy||blocked;b.addEventListener('click',()=>choose(p.id));list.append(b)}}
function clearForm(){selectedId=null;image='';$('title').value='';$('body').value='';$('date').value=today();$('image').value='';preview();renderList()}
function choose(id){const p=posts.find(p=>p.id===id);if(!p)return;selectedId=p.id;image=p.image||'';$('title').value=p.title||'';$('body').value=p.body||'';$('date').value=p.date||today();$('image').value='';preview();renderList();msg('수정 중: '+p.title)}
async function load(){if(!isAdmin()){blocked=true;buttons();msg('문주 Google 계정으로 로그인하면 Firebase 게시글을 불러올 수 있어.',true);return;}
 busy=true;buttons();msg('Firebase 최신 도술빌드 불러오는 중...');try{
  const snap=await read(definitions.builds.ref);
  if(!snap.exists()){
   revision=null;blocked=false;posts=deep(initial);clearForm();msg(`Firebase 도술빌드 최초 등록 전 · 기존 ${posts.length}개 게시글이 준비돼 있어. 「기존 글 Firebase 최초 등록」을 한 번만 누르면 돼.`);return;
  }
  const data=snap.data();if(!Number.isSafeInteger(data.revision)||data.revision<1)throw Error('서버 버전 형식이 올바르지 않아.');
  posts=deep(validate('builds',data.data));revision=data.revision;blocked=false;clearForm();msg(`✅ Firebase 연결 완료 · ${posts.length}개 도술빌드 · 수정 후 저장 즉시 홈페이지에 반영`);
 }catch(e){blocked=true;revision=null;msg('⛔ Firebase 글 불러오기 실패: '+(e.code||e.message)+' · 기존 글을 덮어쓰지 않았어.',true)}
 finally{busy=false;buttons();renderList()}}
async function initialize(){if(busy||!isAdmin()||revision!==null||blocked)return;
 busy=true;buttons();msg('기존 도술빌드를 Firebase에 최초 등록하는 중...');
 try{
  const prepared=validate('builds',initial);
  await runTransaction(db,async tx=>{
   const snap=await tx.get(definitions.builds.ref);
   if(snap.exists())throw Error('서버 도술빌드가 이미 있어. 덮어쓰지 않고 기존 서버 자료를 불러와야 해.');
   tx.set(definitions.builds.ref,{format:'party-content-builds-v1',revision:1,data:prepared,updatedAt:serverTimestamp()});
  });
  const snap=await read(definitions.builds.ref);
  if(!snap.exists()||snap.data().revision!==1)throw Error('저장 후 Firebase 재조회 실패');
  posts=deep(validate('builds',snap.data().data));revision=1;blocked=false;clearForm();msg(`✅ Firebase 최초 등록 완료 · 기존 글 ${posts.length}개 보존 · 이제 이 화면에서 바로 저장 가능`);
 }catch(e){blocked=true;msg('⛔ 최초 등록 확인 필요: '+(e.code||e.message)+' · 기존 자료는 삭제하지 않았어. 서버 다시 읽기로 확인해 줘.',true)}
 finally{busy=false;buttons();renderList()}}
async function publish(remove=false){if(busy||revision===null||!isAdmin()||blocked)return;
 const old=posts.find(p=>p.id===selectedId);if(remove&&!old)return;
 const title=$('title').value.trim(),date=$('date').value,body=$('body').value.trim();
 if(!remove&&(!title||!/^\d{4}-\d{2}-\d{2}$/.test(date))){msg('제목과 작성 날짜를 입력해 줘.',true);return}
 if(remove&&!confirm('「'+old.title+'」 도술빌드를 삭제할까? 기존 서버 버전은 복구용 이력으로 보존돼.'))return;
 const next=deep(posts);
 if(remove){const i=next.findIndex(p=>p.id===old.id);if(i>=0)next.splice(i,1)}
 else{const updated={id:old?.id||('build-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)),title,date,image,body};
  const i=next.findIndex(p=>p.id===updated.id);if(i>=0)next[i]=updated;else next.unshift(updated)}
 try{validate('builds',next)}catch(e){msg('저장하지 않았어: '+e.message,true);return}
 busy=true;buttons();msg(remove?'Firebase에서 도술빌드 삭제 중...':'Firebase에 도술빌드 저장 중...');
 try{revision=await save('builds',next,revision);posts=next;
  if(remove){clearForm()}else{const chosen=old?.id||next[0].id;choose(chosen)}
  msg(`✅ Firebase ${remove?'삭제':'저장'} 완료 · 홈페이지 자동 반영 · 총 ${posts.length}개 (버전 ${revision})`);
 }catch(e){blocked=true;msg('⛔ Firebase 저장 확인 실패: '+(e.code||e.message)+' · 입력 화면은 유지했어. 서버 내용 확인 전 다시 저장하지 마.',true)}
 finally{busy=false;buttons();renderList()}}
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('사진을 읽을 수 없어.'));r.readAsDataURL(file)})}
function compress(src){return new Promise((resolve,reject)=>{const img=new Image();img.onerror=()=>reject(Error('지원하지 않는 사진 형식이야.'));img.onload=()=>{
  const target=205000;let best='';const dimensions=[1800,1500,1200,950,760];
  for(const bound of dimensions){const scale=Math.min(1,bound/img.width,2600/img.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   for(const quality of [.82,.69,.56,.44]){let out=canvas.toDataURL('image/webp',quality);if(!out.startsWith('data:image/webp'))out=canvas.toDataURL('image/jpeg',quality);if(!best||out.length<best.length)best=out;if(out.length<=target){resolve(out);return}}
  }
  if(best&&best.length<=330000)resolve(best);else reject(Error('압축 후에도 사진이 너무 커. 조금 더 작은 사진을 선택해 줘.'));
 };img.src=src})}
$('image').addEventListener('change',async()=>{const f=$('image').files?.[0];if(!f)return;
 if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>18*1024*1024){msg('JPG·PNG·WebP, 18MB 이하 사진만 선택할 수 있어.',true);$('image').value='';return}
 try{msg('사진을 Firebase 저장 크기에 맞게 압축 중...');image=await compress(await readFile(f));preview();msg('사진 준비 완료 · 「이 글 Firebase에 저장」을 누르면 글과 함께 게시돼.')}catch(e){msg('사진 처리 실패: '+e.message,true);$('image').value=''}});
$('newPost').addEventListener('click',()=>{clearForm();msg('새 글 작성 중 · 저장하면 Firebase에 바로 게시돼.')});
$('removeImage').addEventListener('click',()=>{image='';$('image').value='';preview();msg('사진을 지웠어. 글을 저장하면 반영돼.')});
$('savePost').addEventListener('click',()=>publish(false));
$('deletePost').addEventListener('click',()=>publish(true));
$('cloudLogin').addEventListener('click',async()=>{try{await login();await load()}catch(e){msg('로그인 실패: '+(e.code||e.message),true)}});
$('cloudReload').addEventListener('click',()=>{if(($('title').value.trim()||$('body').value.trim())&&!confirm('현재 입력 중인 내용은 서버 자료로 교체돼. 다시 불러올까?'))return;load()});
$('cloudInit').addEventListener('click',initialize);
$('export').addEventListener('click',()=>{const txt='window.PARTY_VERIFIED_BUILDS = '+JSON.stringify(posts,null,2).replace(/</g,'\\u003c')+';\n';const blob=new Blob([txt],{type:'text/javascript;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='party-build-data.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);msg('도술빌드 백업 파일 다운로드 완료 · Firebase 게시에는 필요 없어.')});
clearForm();blocked=true;buttons();msg('관리자 로그인 상태 확인 중...');await waitAuth();if(isAdmin())await load();else msg('Google 문주 계정으로 로그인해 줘. 기존 GitHub 글은 그대로 보존돼.');
