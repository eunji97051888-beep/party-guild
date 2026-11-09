/* PARTY public Firebase attendance: latest session for each of 4 guild activities. */
import {db,onSnapshot} from './party-firebase-shared.js';
import {doc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const root=document.getElementById('partyAttendanceHighlights');
if(root){
 const create=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
 // Recognize the same content with or without spaces (e.g. 신기 쟁탈전 / 신기쟁탈전).
 const kinds=['결계지방어','요신토벌령','미혹의정원','신기쟁탈전'];
 const normalize=name=>String(name||'').replace(/\s+/g,'');
 function hint(text){root.replaceChildren(create('p','party-attendance-loading',text));}
 function draw(sessions){
  // Only published actual sessions; never invent attendance counts or placeholder records.
  const records=sessions.map((s,i)=>({s,i,key:normalize(s?.content)}))
   .filter(({s,key})=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s.date||'')&&kinds.includes(key)&&Array.isArray(s.members));
  // Latest one per content, regardless of how many older sessions exist.
  const byKind=new Map();
  for(const row of records){
   const old=byKind.get(row.key);
   if(!old||row.s.date>old.s.date||(row.s.date===old.s.date&&(Number(row.s.round)||0)>(Number(old.s.round)||0))||(row.s.date===old.s.date&&Number(row.s.round)===Number(old.s.round)&&row.i>old.i))byKind.set(row.key,row);
  }
  const newest=[...byKind.values()].sort((a,b)=>
   b.s.date.localeCompare(a.s.date)||kinds.indexOf(a.key)-kinds.indexOf(b.key));
  root.replaceChildren();
  if(!newest.length){hint('아직 공개된 문파 콘텐츠 출석 기록이 없어요.');return;}
  for(const {s} of newest){
   const present=s.members.filter(m=>m&&m.status==='present').length;
   const absent=s.members.filter(m=>m&&m.status==='absent').length;
   const a=create('a','party-attendance-tile');
   a.href='attendance-view.html?date='+encodeURIComponent(s.date);
   a.setAttribute('aria-label',`${s.content} · ${s.date} · ${present}명 참석 · 상세 출석 보기`);
   const kicker=create('div','party-attendance-kicker');
   kicker.append(create('span','party-attendance-date',s.date),create('span','party-attendance-round',s.label||((Number.isInteger(s.round)&&s.round>0)?s.round+'회차':'문파 콘텐츠')));
   const numbers=create('div','party-attendance-summary');
   numbers.append(create('b','',present),create('span','','명 참석'));
   const footer=create('div','party-attendance-foot');
   footer.append(create('span','party-attendance-detail-count',`불참 ${absent}명 · 등록 ${s.members.length}명`),create('span','party-attendance-go','상세 보기 ↗'));
   a.append(kicker,create('strong','party-attendance-name',s.content),numbers,footer);
   root.append(a);
  }
 }
 try{
  onSnapshot(doc(db,'publicContent','attendancePublicLiveV1'),snapshot=>{
   if(!snapshot.exists()){hint('공개 출석 데이터가 아직 등록되지 않았어요.');return;}
   const wrapper=snapshot.data(),raw=wrapper.payload;
   if(wrapper.format!=='party-attendance-public-v2'||raw?.version!==2||!Array.isArray(raw.sessions)){
    hint('출석 데이터 형식을 확인할 수 없어요.');return;
   }
   draw(raw.sessions);
  },error=>{console.warn('문파 출석 요약 읽기 오류:',error);hint('출석 현황을 불러오지 못했어요. 전체 출석 보기에서 확인해 주세요.');});
 }catch(e){console.warn('Firebase 출석 요약 초기화 실패:',e);hint('출석 현황을 불러오지 못했어요.');}
}
