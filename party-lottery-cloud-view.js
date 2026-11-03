// Public Hall: listen to Firebase; preserve existing static JS as fallback until first cloud publication.
import {refs,onSnapshot} from './party-firebase-shared.js';
const badge=document.getElementById('partyLotteryCloudStatus');
const flags={draws:false,balances:false};
function report(){if(badge)badge.textContent=`자료 출처: 당첨 ${flags.draws?'Firebase':'기존 공개 파일'} · 킵 잔액 ${flags.balances?'Firebase':'기존 공개 파일'}`;}
function watch(ref,kind,validate,apply){onSnapshot(ref,snap=>{
 if(!snap.exists()){flags[kind]=false;report();return;}
 const v=snap.data();if(!validate(v.data)){if(badge)badge.textContent='공개 데이터 형식 오류 · 기존 GitHub 파일은 보존됨';return;}
 flags[kind]=true;apply(v.data);report();
},e=>{if(badge)badge.textContent='Firebase 공개 장부 읽기 오류 · 기존 게시 파일 유지: '+(e.code||e.message);});}
watch(refs.draws,'draws',x=>Array.isArray(x),x=>window.dispatchEvent(new CustomEvent('party-lottery-draws',{detail:x})));
watch(refs.balances,'balances',x=>x&&Array.isArray(x.members),x=>window.dispatchEvent(new CustomEvent('party-lottery-balances',{detail:x})));
report();
