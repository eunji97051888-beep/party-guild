(function(){'use strict';
const list=document.getElementById('yechiEditList'), title=document.getElementById('yechiNewTitle'), file=document.getElementById('yechiNewImage'), status=document.getElementById('yechiImageStatus');
if(!list||!title||!file||!status)return;
let reports=Array.isArray(window.YECHI_REPORTS)?window.YECHI_REPORTS.map(x=>({...x})):[];
function say(t){status.textContent=t}
function render(){list.replaceChildren();reports.forEach((report,i)=>{
const row=document.createElement('div');row.className='yechi-edit-row';const preview=document.createElement('img');preview.src=report.image;preview.alt='보고서 미리보기';
const text=document.createElement('input');text.value=report.title;text.setAttribute('aria-label','보고서 제목');text.maxLength=100;text.oninput=()=>{reports[i].title=text.value};
const actions=document.createElement('div');actions.className='yechi-edit-buttons';
[['↑',()=>move(i,-1)],['↓',()=>move(i,1)],['삭제',()=>remove(i)]].forEach(([label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b)});
row.append(preview,text,actions);list.append(row)});}
function move(i,d){const to=i+d;if(to<0||to>=reports.length)return;[reports[i],reports[to]]=[reports[to],reports[i]];render();say('순서가 변경됐어. 게시 파일 다운로드 후 업로드해 줘.');}
function remove(i){if(!confirm('이 보고서를 목록에서 삭제할까?'))return;reports.splice(i,1);render();say('목록에서 삭제했어. 게시 파일을 업로드하기 전까지 홈페이지에는 그대로 남아 있어.');}
async function convert(source){if(!/^image\/(jpeg|png|webp)$/.test(source.type))throw Error('JPG, PNG, WebP 이미지만 가능해.');if(source.size>25*1024*1024)throw Error('25MB 이하로 올려줘.');
const url=URL.createObjectURL(source);try{const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url});
const factor=Math.min(1,1200/img.naturalWidth,2000/img.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.78)}finally{URL.revokeObjectURL(url)}}
document.getElementById('yechiAddReport').onclick=async()=>{const t=title.value.trim(),f=file.files[0];if(!t||!f){say('제목과 사진을 모두 입력해 줘.');return}say('사진 최적화 중…');try{const image=await convert(f);reports.unshift({title:t,image});title.value='';file.value='';render();say('보고서를 추가했어. 전체 목록을 확인한 다음 게시 파일을 다운로드해 줘.')}catch(e){say(e.message||'이미지 처리를 실패했어.')}};
document.getElementById('yechiDownloadData').onclick=()=>{if(reports.some(r=>!r.title.trim())){say('제목이 비어 있는 보고서를 확인해 줘.');return}
const data='/* Public report archive */\nwindow.YECHI_REPORTS = '+JSON.stringify(reports)+';\n';
const blob=new Blob([data],{type:'text/javascript;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yechi-report-data.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
say('다운로드 완료! yechi-report-data.js 하나를 GitHub 저장소 최상위에 올려 Commit changes를 눌러줘.');};
render();
})();