import {definitions,validate,onSnapshot} from './party-content-cloud-core.js';
function observe(kind,onData){const d=definitions[kind];onSnapshot(d.ref,s=>{if(!s.exists())return;try{const v=validate(kind,s.data().data);onData(v)}catch(e){console.warn('파티 공개 '+d.name+' 오류, GitHub 파일 유지:',e)}},e=>console.warn('파티 공개 '+d.name+' 서버 조회 실패; 게시 파일 유지',e));}
observe('home',v=>{window.PARTY_DEFAULT=v;window.dispatchEvent(new CustomEvent('party-content-home-changed',{detail:v}));});
observe('activity',v=>{window.PARTY_ACTIVITY_NEWS=v;window.dispatchEvent(new CustomEvent('party-content-activity-changed',{detail:v}));});
observe('weekly',v=>{window.PARTY_WEEKLY_BOARD=v;window.dispatchEvent(new Event('party-board-refresh'));});
