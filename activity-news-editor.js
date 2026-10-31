(()=>{'use strict';
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

const $=id=>document.getElementById(id);let posts=Array.isArray(window.PARTY_ACTIVITY_NEWS)?JSON.parse(JSON.stringify(window.PARTY_ACTIVITY_NEWS)):[],selected=-1,photos=[],currentPage=1;const pageSize=5;
const date=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const msg=t=>$('status').textContent=t;
function thumbs(){$('thumbs').replaceChildren();photos.forEach((src,i)=>{const img=document.createElement('img');img.src=src;img.alt='첨부 사진 '+(i+1);$('thumbs').append(img)})}
function clearForm(){selected=-1;$('date').value=date();$('title').value='';$('body').value='';$('link').value='';$('photos').value='';photos=[];thumbs();msg('새 글 작성 중');renderList()}
function choose(i){selected=i;const p=posts[i];if(!p)return;$('date').value=p.date||date();$('title').value=p.title||'';$('body').value=p.body||'';$('link').value=p.link||'';photos=Array.isArray(p.photos)?[...p.photos]:[];$('photos').value='';thumbs();renderList();msg('수정 중: '+p.title)}
function filteredIndices(){const query=$('postSearch').value.trim().toLocaleLowerCase();return posts.map((p,i)=>({p,i})).filter(({p})=>p&&(!query||((String(p.date||'')+' '+String(p.title||'')).toLocaleLowerCase().includes(query)))).sort((a,b)=>String(b.p.date||'').localeCompare(String(a.p.date||''))||String(b.p.id||'').localeCompare(String(a.p.id||''))||a.i-b.i).map(x=>x.i)}
function renderList(){const list=$('posts'),pagination=$('postPagination');list.replaceChildren();pagination.replaceChildren();const matches=filteredIndices(),totalPages=Math.max(1,Math.ceil(matches.length/pageSize));currentPage=Math.max(1,Math.min(currentPage,totalPages));$('postSummary').textContent=$('postSearch').value.trim()?`검색 결과 ${matches.length}개 / 전체 ${posts.length}개`:`전체 ${posts.length}개 · 최신순`;
if(!matches.length){const empty=document.createElement('div');empty.className='post-empty';empty.textContent=posts.length?'검색된 소식이 없어. 검색어를 바꿔 봐.':'등록된 글이 없어. 첫 활동 소식을 작성해 봐!';list.append(empty)}
for(const i of matches.slice((currentPage-1)*pageSize,currentPage*pageSize)){const p=posts[i],div=document.createElement('div');div.className='post-item'+(selected===i?' is-selected':'');const b=document.createElement('button');b.className='post-pick';b.type='button';const d=document.createElement('span');d.className='post-date';d.textContent=p.date||'날짜 없음';const t=document.createElement('span');t.textContent=(selected===i?'✎ ':'')+(p.title||'(제목 없음)');b.append(d,t);b.setAttribute('aria-pressed',String(selected===i));b.addEventListener('click',()=>choose(i));div.append(b);list.append(div)}
if(totalPages===1)return;
function button(label,page,options={}){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=!!options.disabled;if(options.current){b.className='is-current';b.setAttribute('aria-current','page')}if(options.title)b.setAttribute('aria-label',options.title);b.addEventListener('click',()=>{currentPage=page;renderList()});pagination.append(b)}
button('‹ 이전',currentPage-1,{disabled:currentPage===1,title:'이전 페이지'});const first=Math.max(1,Math.min(currentPage-2,totalPages-4)),last=Math.min(totalPages,first+4);for(let n=first;n<=last;n++)button(String(n),n,{current:n===currentPage,title:n+'페이지'});button('다음 ›',currentPage+1,{disabled:currentPage===totalPages,title:'다음 페이지'});const info=document.createElement('span');info.className='post-page-info';info.textContent=currentPage+' / '+totalPages+' 페이지';pagination.append(info)
}
function showSelectedPage(){const i=filteredIndices().indexOf(selected);if(i>=0)currentPage=Math.floor(i/pageSize)+1}
$('postSearch').addEventListener('input',()=>{currentPage=1;renderList()});
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('파일 읽기 실패'));r.onload=()=>resolve(r.result);r.readAsDataURL(file)})}
function compress(data){return new Promise((resolve,reject)=>{const img=new Image();img.onerror=()=>reject(new Error('지원하지 않는 이미지입니다.'));img.onload=()=>{const ratio=Math.min(1,1000/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*ratio));c.height=Math.max(1,Math.round(img.height*ratio));c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.7))};img.src=data})}
$('photos').addEventListener('change',async()=>{const fs=Array.from($('photos').files||[]);if(fs.length>3){alert('한 글에는 사진을 최대 3장까지 첨부할 수 있어.');$('photos').value='';return}try{msg('사진 압축 중...');const out=[];for(const f of fs){if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>18*1024*1024)throw Error('JPG·PNG·WebP, 파일당 18MB 이하만 가능해.');out.push(await compress(await readFile(f)))}photos=out;thumbs();msg(photos.length+'장 준비 완료. 글 저장을 눌러줘.')}catch(e){msg(e.message);$('photos').value=''}});
$('newPost').onclick=clearForm;$('clearPhotos').onclick=()=>{photos=[];$('photos').value='';thumbs();msg('사진 삭제 준비 완료. 글 저장을 눌러줘.')};
$('preset').onclick=()=>{if(!$('title').value){const d=$('date').value||date();$('title').value=Number(d.slice(5,7))+'월 '+Number(d.slice(8,10))+'일 콘텐츠 출석 기록 완료'}if(!$('body').value)$('body').value='요신토벌령과 결계지방어 출석 기록을 등록했습니다.\n참여 여부를 확인해 주세요!';$('link').value='attendance'};
$('savePost').onclick=()=>{const title=$('title').value.trim(),d=$('date').value,body=$('body').value.trim();if(!title||!d){alert('날짜와 제목을 입력해 줘.');return}const old=selected>=0?posts[selected]:null;const p={id:old?.id||String(Date.now()),date:d,title,body,link:$('link').value,photos:[...photos]};if(selected<0){posts.unshift(p);selected=0}else posts[selected]=p;$('postSearch').value='';showSelectedPage();renderList();msg('글 저장 완료! 홈페이지에 반영하려면 맨 아래 JS 파일 다운로드도 눌러줘.')};
$('deletePost').onclick=()=>{if(selected<0)return;if(!confirm('이 글을 삭제할까?'))return;posts.splice(selected,1);clearForm()};
$('export').onclick=async()=>{const text='window.PARTY_ACTIVITY_NEWS = '+JSON.stringify(posts,null,2).replace(/</g,'\\u003c')+';\n';try{const result=await guildSave('activity-news-data.js',new Blob([text],{type:'text/javascript;charset=utf-8'}));msg(guildSaveNotice(result,'activity-news-data.js'))}catch(e){const error=guildSaveError(e);if(error)msg('저장 실패: '+error)}};
clearForm()})();
