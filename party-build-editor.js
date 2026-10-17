/* 파티 문파 | 도술빌드 작성 / JS 게시 v1 */
(()=>{'use strict';
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
 $('export').onclick=()=>{const txt='window.PARTY_VERIFIED_BUILDS = '+JSON.stringify(posts,null,2).replace(/</g,'\\u003c')+';\n';const blob=new Blob([txt],{type:'text/javascript;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='party-build-data.js';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);status('파일을 다운로드했어요. GitHub의 party-build-data.js를 교체하고 Commit changes를 눌러 주세요.')};
 clearForm();
})();
