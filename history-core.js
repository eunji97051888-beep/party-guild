/* PARTY local history V11. Local browser only. Keeps 25 snapshots per ledger. */
(()=>{'use strict';
const HISTORY_KEY='party-guild-history-v11';
const CONFIG={
 'party-guild-v11-attendance':'attendance',
 'party-guild-v12-rewards':'rewards'
};
const MAX=25;
function read(){try{const a=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&CONFIG[x.key]&&typeof x.raw==='string'&&typeof x.date==='string'):[]}catch{return []}}
function validate(key,raw){let x;try{x=JSON.parse(raw)}catch{return false}if(!x||typeof x!=='object'||Array.isArray(x))return false;
 if(key==='party-guild-v11-attendance')return Array.isArray(x.members)&&Array.isArray(x.sessions)&&x.attendance&&typeof x.attendance==='object'&&!Array.isArray(x.attendance);
 if(key==='party-guild-v12-rewards')return Number.isSafeInteger(x.balance)&&Array.isArray(x.items)&&Array.isArray(x.requests)&&Array.isArray(x.ledger);
 return false}
function snapshot(key,raw,label){if(!CONFIG[key]||!raw||!validate(key,raw))return false;let list=read();const previous=list.filter(x=>x.key===key).at(-1);if(previous&&previous.raw===raw)return true;list.push({id:Date.now()+'-'+Math.random().toString(36).slice(2),key,raw,date:new Date().toISOString(),label});const keep={attendance:0,rewards:0};list=list.reverse().filter(x=>{const type=CONFIG[x.key];return ++keep[type]<=MAX}).reverse();localStorage.setItem(HISTORY_KEY,JSON.stringify(list));return true}
function beforeSave(key,newRaw){try{if(!validate(key,newRaw))return;const old=localStorage.getItem(key);if(old&&old!==newRaw)snapshot(key,old,'변경 전 자동 저장')}catch(e){console.warn('PARTY 기록 이력 저장 실패:',e)}}
function restore(id){const entry=read().find(x=>x.id===id);if(!entry||!validate(entry.key,entry.raw))throw Error('복원할 기록이 유효하지 않아.');const current=localStorage.getItem(entry.key);if(current&&current!==entry.raw){if(!snapshot(entry.key,current,'복원 직전 안전 백업'))throw Error('현재 기록을 백업하지 못했어.')}localStorage.setItem(entry.key,entry.raw);return CONFIG[entry.key]}
window.PARTY_HISTORY={read,validate,beforeSave,restore,historyKey:HISTORY_KEY,config:CONFIG};
})();
