(function(){'use strict';
const guildSave=window.PARTY_GUILD_OVERWRITE_SAVE||(window.PARTY_GUILD_OVERWRITE_SAVE=(()=>{
  const handles=new Map();
  return async function saveNamedFile(filename,source,mime='text/javascript'){
    const blobFactory=typeof source==='function'?source:()=>source;
    if(typeof window.showSaveFilePicker==='function'){
      let handle=handles.get(filename);
      if(!handle){
        const ext='.'+filename.split('.').pop().toLowerCase();
        handle=await window.showSaveFilePicker({
          suggestedName:filename,
          types:[{description:'파티 문파 게시 파일',accept:{[mime]:[ext]}}]
        });
        // Exact file names matter because GitHub Pages loads fixed paths.
        if(handle.name!==filename)throw new Error('파일 이름을 '+filename+'(으)로 저장해 줘.');
        handles.set(filename,handle);
      }
      try{
        const blob=await blobFactory();
        const writer=await handle.createWritable();
        try{await writer.write(blob);await writer.close()}
        catch(err){try{await writer.abort()}catch{}throw err}
        return 'saved';
      }catch(err){handles.delete(filename);throw err}
    }
    // Non-Chromium fallback: preserve the old download behavior.
    const blob=await blobFactory();
    const url=URL.createObjectURL(blob);
    try{const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove()}
    finally{setTimeout(()=>URL.revokeObjectURL(url),10000)}
    return 'downloaded';
  }
})());
const guildSaveNotice=(result,filename)=>result==='saved'
 ? filename+' 저장 완료! 같은 탭에서 다시 저장하면 기존 파일에 덮어써. GitHub에 올려 Commit changes를 눌러줘.'
 : filename+' 다운로드 완료. 이 브라우저에서는 덮어쓰기가 지원되지 않아 파일명 중복이 생길 수 있어. GitHub에 업로드해 줘.';
const guildSaveError=err=>err?.name==='AbortError'?null:(err?.message||String(err));

const list=document.getElementById('yechiEditList'), title=document.getElementById('yechiNewTitle'), file=document.getElementById('yechiNewImage'), status=document.getElementById('yechiImageStatus');
if(!list||!title||!file||!status)return;
let reports=Array.isArray(window.YECHI_REPORTS)?window.YECHI_REPORTS.map(x=>({...x})):[];
function say(t){status.textContent=t}
const PER_PAGE=4;
let page=0;
const style=document.createElement('style');
style.textContent=`
#yechiReportEditor{box-sizing:border-box;min-width:0}
#yechiReportEditor .yechi-edit-list{display:grid;gap:10px;margin:14px 0}
#yechiReportEditor .yechi-edit-row{display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;padding:12px;background:#111e2c;border:1px solid #49505b;border-radius:12px;align-items:center}
#yechiReportEditor .yechi-thumb{width:72px;height:88px;padding:0;background:#0a1420;border:1px solid #766343;border-radius:8px;overflow:hidden;cursor:zoom-in}
#yechiReportEditor .yechi-thumb img{display:block;width:100%;height:100%;max-height:88px;object-fit:contain;margin:0}
#yechiReportEditor .yechi-edit-info{min-width:0}
#yechiReportEditor .yechi-edit-info input{box-sizing:border-box;width:100%;min-width:0;padding:8px;font-size:14px}
#yechiReportEditor .yechi-edit-number{display:block;font-size:12px;color:#c8b48f;margin-bottom:6px}
#yechiReportEditor .yechi-edit-buttons{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#yechiReportEditor .yechi-edit-buttons button,#yechiReportEditor .yechi-edit-pager button{background:#243345;color:#f4dfbb;border:1px solid #746044;border-radius:7px;padding:7px 10px;cursor:pointer;font:inherit;font-size:13px;min-height:34px}
#yechiReportEditor button:disabled{opacity:.35;cursor:default}
#yechiReportEditor .yechi-edit-buttons .yechi-remove{color:#ffc6c6;border-color:#8f5252}
#yechiReportEditor .yechi-edit-pager{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0;font-size:13px;color:#e8d4b1}
#yechiReportEditor .yechi-edit-pager[hidden]{display:none}
#yechiReportEditor .yechi-edit-toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #665638}
#yechiReportEditor .yechi-edit-toolbar .action{font-size:14px;padding:10px 12px}
#yechiReportEditor .yechi-add-form{margin-top:16px;padding:12px;border:1px dashed #8a7148;border-radius:10px}
#yechiReportEditor .yechi-add-form summary{cursor:pointer;color:#f3d295;font-weight:700;padding:4px}
#yechiReportEditor .yechi-add-form input{box-sizing:border-box;width:100%;min-width:0}
.yechi-editor-dialog{box-sizing:border-box;width:min(900px,94vw);max-height:90vh;padding:0;border:1px solid #aa8551;border-radius:12px;background:#122031;color:#f5dfb9}
.yechi-editor-dialog::backdrop{background:#000b}
.yechi-editor-dialog header{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px;background:#122031}
.yechi-editor-dialog button{background:#273b50;color:#fff;border:1px solid #8a7148;border-radius:8px;padding:9px 13px;cursor:pointer;white-space:nowrap}
.yechi-editor-dialog img{display:block;width:100%;height:auto;max-width:100%;margin:0}
@media(max-width:480px){#yechiReportEditor{padding:16px!important}#yechiReportEditor .yechi-edit-row{grid-template-columns:58px minmax(0,1fr);gap:9px;padding:9px}#yechiReportEditor .yechi-thumb{width:58px;height:78px}#yechiReportEditor .yechi-edit-buttons button{padding:7px 8px}}
`;
document.head.append(style);
const toolbar=document.createElement('div');toolbar.className='yechi-edit-toolbar';
const count=document.createElement('strong');
const download=document.getElementById('yechiDownloadData');
toolbar.append(count,download);list.before(toolbar);
const pager=document.createElement('nav');pager.className='yechi-edit-pager';pager.setAttribute('aria-label','보고서 편집 목록 페이지');
const prev=document.createElement('button'),next=document.createElement('button'),detail=document.createElement('span');
prev.type=next.type='button';prev.textContent='‹ 이전';next.textContent='다음 ›';detail.setAttribute('aria-live','polite');pager.append(prev,detail,next);list.after(pager);
prev.onclick=()=>{page--;render()};next.onclick=()=>{page++;render()};
const addButton=document.getElementById('yechiAddReport');
const oldActions=addButton.parentElement;
const form=document.createElement('details');form.className='yechi-add-form';
const summary=document.createElement('summary');summary.textContent='＋ 새 보고서 추가';
form.append(summary,title.closest('.field'),file.closest('.field'),addButton);pager.after(form);
if(oldActions&&!oldActions.children.length)oldActions.remove();
const hint=document.querySelector('#yechiReportEditor > .hint');
if(hint)hint.textContent='작은 사진을 누르면 크게 볼 수 있어. 한 페이지에 4개씩 표시하고, 제목과 순서를 고친 뒤 게시 파일을 다운로드해 줘.';
function openPreview(report,trigger){
 const dialog=document.createElement('dialog');dialog.className='yechi-editor-dialog';dialog.setAttribute('aria-label',report.title||'보고서 미리보기');
 const head=document.createElement('header'),label=document.createElement('strong'),close=document.createElement('button'),img=document.createElement('img');
 label.textContent=report.title;close.type='button';close.textContent='✕ 닫기';img.src=report.image;img.alt=report.title;
 head.append(label,close);dialog.append(head,img);document.body.append(dialog);
 const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 dialog.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;dialog.remove();trigger.focus()},{once:true});
 close.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 dialog.showModal();close.focus();
}
function render(){
 const pages=Math.max(1,Math.ceil(reports.length/PER_PAGE));page=Math.max(0,Math.min(page,pages-1));
 count.textContent='등록된 보고서 '+reports.length+'개';detail.textContent=(page+1)+' / '+pages+' 페이지';prev.disabled=page===0;next.disabled=page>=pages-1;pager.hidden=reports.length<=PER_PAGE;
 list.replaceChildren();
 if(!reports.length){const empty=document.createElement('p');empty.textContent='아직 등록된 보고서가 없어. 아래에서 새 보고서를 추가해 줘.';list.append(empty);return}
 reports.slice(page*PER_PAGE,(page+1)*PER_PAGE).forEach((report,offset)=>{
 const i=page*PER_PAGE+offset;
 const row=document.createElement('div');row.className='yechi-edit-row';
 const thumb=document.createElement('button');thumb.type='button';thumb.className='yechi-thumb';thumb.setAttribute('aria-label',report.title+' 크게 보기');thumb.onclick=()=>openPreview(report,thumb);
 const preview=document.createElement('img');preview.src=report.image;preview.alt='보고서 미리보기';preview.loading='lazy';thumb.append(preview);
 const info=document.createElement('div');info.className='yechi-edit-info';
 const number=document.createElement('span');number.className='yechi-edit-number';number.textContent='게시 순서 '+(i+1);
 const text=document.createElement('input');text.value=report.title;text.setAttribute('aria-label','보고서 제목');text.maxLength=100;text.oninput=()=>{report.title=text.value;thumb.setAttribute('aria-label',text.value+' 크게 보기')};
 const actions=document.createElement('div');actions.className='yechi-edit-buttons';
 [['↑ 위로',()=>move(i,-1),i===0],['↓ 아래로',()=>move(i,1),i===reports.length-1],['삭제',()=>remove(i),false]].forEach(([label,fn,disabled])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=fn;if(label==='삭제')b.className='yechi-remove';actions.append(b)});
 info.append(number,text,actions);row.append(thumb,info);list.append(row);
 });
}
function move(i,d){const to=i+d;if(to<0||to>=reports.length)return;[reports[i],reports[to]]=[reports[to],reports[i]];page=Math.floor(to/PER_PAGE);render();say('순서가 변경됐어. 게시 파일 다운로드 후 업로드해 줘.');}
function remove(i){if(!confirm('「'+reports[i].title+'」 보고서를 목록에서 삭제할까?'))return;reports.splice(i,1);render();say('목록에서 삭제했어. 게시 파일을 업로드하기 전까지 홈페이지에는 그대로 남아 있어.');}
async function convert(source){if(!/^image\/(jpeg|png|webp)$/.test(source.type))throw Error('JPG, PNG, WebP 이미지만 가능해.');if(source.size>25*1024*1024)throw Error('25MB 이하로 올려줘.');
const url=URL.createObjectURL(source);try{const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url});
const factor=Math.min(1,1200/img.naturalWidth,2000/img.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.78)}finally{URL.revokeObjectURL(url)}}
document.getElementById('yechiAddReport').onclick=async()=>{const t=title.value.trim(),f=file.files[0];if(!t||!f){say('제목과 사진을 모두 입력해 줘.');return}say('사진 최적화 중…');try{const image=await convert(f);reports.unshift({title:t,image});title.value='';file.value='';page=0;form.open=false;render();say('보고서를 추가했어. 전체 목록을 확인한 다음 게시 파일을 다운로드해 줘.')}catch(e){say(e.message||'이미지 처리를 실패했어.')}};
document.getElementById('yechiDownloadData').onclick=async()=>{if(reports.some(r=>!r.title.trim())){say('제목이 비어 있는 보고서를 확인해 줘.');return}
const data='/* Public report archive */\nwindow.YECHI_REPORTS = '+JSON.stringify(reports)+';\n';
try{const result=await guildSave('yechi-report-data.js',new Blob([data],{type:'text/javascript;charset=utf-8'}));say(guildSaveNotice(result,'yechi-report-data.js'))}catch(e){const error=guildSaveError(e);if(error)say('저장 실패: '+error)}};
render();
})();