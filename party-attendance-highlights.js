/* PARTY public Firebase attendance: latest 3 actual sessions (no synthetic counts). */
import {db,onSnapshot} from './party-firebase-shared.js';
import {doc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const root=document.getElementById('partyAttendanceHighlights');
if(root){
 const create=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
 function hint(text){root.replaceChildren(create('p','party-attendance-loading',text));}
 function draw(sessions){
  const newest=sessions.map((s,i)=>({s,i})).filter(({s})=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s.date||'')&&typeof s.content==='string'&&Array.isArray(s.members))
   .sort((a,b)=>String(b.s.date).localeCompare(String(a.s.date))||b.i-a.i).slice(0,3);
  root.replaceChildren();
  if(!newest.length){hint('아직 공개된 문파 콘텐츠 출석 기록이 없어요.');return;}
  for(const {s} of newest){
   const present=s.members.filter(m=>m&&m.status==='present').length;
   const a=create('a','party-attendance-tile');a.href='attendance-view.html?date='+encodeURIComponent(s.date);
   a.setAttribute('aria-label',`${s.content} · ${s.date} · ${present}명 참석 · 상세 출석 보기`);
   const kicker=create('div','party-attendance-kicker');kicker.append(create('span','',s.date),create('span','',s.label||((Number.isInteger(s.round)&&s.round>0)?s.round+'회차':'문파 콘텐츠')));
   const numbers=create('div','party-attendance-summary');numbers.append(create('b','',present),create('span','','명 참석'));
   const absent=s.members.filter(m=>m&&m.status==='absent').length;
   const footer=create('div','party-attendance-foot');footer.append(create('span','',`불참 ${absent}명 · 등록 ${s.members.length}명`),create('span','','상세 보기 ↗'));
   a.append(kicker,create('strong','',s.content),numbers,footer);root.append(a);
  }
 }
 try{onSnapshot(doc(db,'publicContent','attendancePublicLiveV1'),snapshot=>{
  if(!snapshot.exists()){hint('공개 출석 데이터가 아직 등록되지 않았어요.');return;}
  const wrapper=snapshot.data(),raw=wrapper.payload;
  if(wrapper.format!=='party-attendance-public-v2'||raw?.version!==2||!Array.isArray(raw.sessions)){hint('출석 데이터 형식을 확인할 수 없어요.');return;}
  draw(raw.sessions);
 },error=>{console.warn('문파 출석 요약 읽기 오류:',error);hint('출석 현황을 불러오지 못했어요. 전체 출석 보기에서 확인해 주세요.');});}
 catch(e){console.warn('Firebase 출석 요약 초기화 실패:',e);hint('출석 현황을 불러오지 못했어요.');}
}
