/* 파티 문파 | 도술빌드 작성 / JS 게시 v1 */
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

 const $=id=>document.getElementById(id),deep=a=>JSON.parse(JSON.stringify(a));
 let posts=deep(Array.isArray(window.PARTY_VERIFIED_BUILDS)?window.PARTY_VERIFIED_BUILDS:[]),selected=-1,image='';
 const date=()=>{const t=new Date();return [t.getFullYear(),String(t.getMonth()+1).padStart(2,'0'),String(t.getDate()).padStart(2,'0')].join('-')};
 const status=t=>$('status').textContent=t;
 function showPreview(){if(image){$('imgPreview').src=image;$('imgPreview').style.display='block'}else{$('imgPreview').removeAttribute('src');$('imgPreview').style.display='none'}}
 function renderList(){$('postList').replaceChildren();if(!posts.length){const p=document.createElement('p');p.className='muted';p.textContent='아직 등록된 빌드가 없습니다.';$('postList').append(p)}posts.forEach((post,i)=>{const b=document.createElement('button');b.type='button';b.textContent=(post.date||'')+' · '+post.title;b.setAttribute('aria-current',selected===i?'true':'false');b.onclick=()=>choose(i);$('postList').append(b)})}
 function clearForm(){selected=-1;image='';$('title').value='';$('body').value='';$('date').value=date();$('image').value='';showPreview();renderList();status('새 글 작성 중')}
 function choose(i){selected=i;const p=posts[i];$('title').value=p.title||'';$('body').value=p.body||'';$('date').value=p.date||date();image=p.image||'';$('image').value='';showPreview();renderList();status('수정 중: '+p.title)}
 const readFile=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(Error('사진 파일을 읽을 수 없습니다.'));r.readAsDataURL(f)});
 const compress=src=>new Promise((res,rej)=>{const img=new Image();img.onerror=()=>rej(Error('사진 형식을 읽을 수 없습니다.'));img.onload=()=>{const ratio=Math.min(1,2100/img.width,4000/img.height);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);let out=canvas.toDataURL('image/webp',.86);if(!out.startsWith('data:image/webp'))out=canvas.toDataURL('image/jpeg',.87);res(out)};img.src=src});
 $('image').onchange=async()=>{const f=$('image').files?.[0];if(!f)return;if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>18*1024*1024){alert('JPG·PNG·WebP 파일 18MB 이하만 등록할 수 있어요.');$('image').value='';return}try{status('사진을 준비하고 있어요...');const next=await compress(await readFile(f));if(next.length>11*1024*1024)throw Error('사진이 너무 커요. 이미지를 조금 줄여서 다시 올려 주세요.');image=next;showPreview();status('사진 준비 완료! 아래 ‘이 글 저장’을 눌러 주세요.')}catch(e){status(e.message);$('image').value=''}};
 $('newPost').onclick=clearForm;
 $('removeImage').onclick=()=>{image='';$('image').value='';showPreview();status('사진을 지웠어요. ‘이 글 저장’으로 반영해 주세요.')};
 $('savePost').onclick=()=>{const title=$('title').value.trim(),d=$('date').value,body=$('body').value.trim();if(!title||!d){alert('제목과 날짜를 입력해 주세요.');return}const old=selected<0?null:posts[selected];const p={id:old?.id||String(Date.now()),title,date:d,image,body};if(selected<0){posts.unshift(p);selected=0}else posts[selected]=p;renderList();status('글 저장 완료! 맨 아래에서 JS 파일을 다운로드해야 실제 게시할 수 있어요.')};
 $('deletePost').onclick=()=>{if(selected<0)return;if(!confirm('이 도술빌드 게시글을 삭제할까요?'))return;posts.splice(selected,1);clearForm()};
 $('export').onclick=async()=>{const txt='window.PARTY_VERIFIED_BUILDS = '+JSON.stringify(posts,null,2).replace(/</g,'\\u003c')+';\n';try{const result=await guildSave('party-build-data.js',new Blob([txt],{type:'text/javascript;charset=utf-8'}));status(guildSaveNotice(result,'party-build-data.js'))}catch(e){const error=guildSaveError(e);if(error)status('저장 실패: '+error)}};
 clearForm();
})();
