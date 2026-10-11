(() => {'use strict';const $=id=>document.getElementById(id),days=['일','월','화','수','목','금','토'];const original=JSON.parse(JSON.stringify(window.PARTY_DEFAULT));const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let currentPreview=null;
 function row(e={days:[1],time:'20:00',name:'',type:'문파 콘텐츠'}){let el=document.createElement('div');el.className='row-edit';el.innerHTML=`<input type="time" class="time" aria-label="시간" value="${escape(e.time)}"><input class="name" aria-label="콘텐츠 이름" placeholder="콘텐츠 이름" value="${escape(e.name)}"><input class="kind" aria-label="종류" placeholder="종류" value="${escape(e.type)}"><button type="button" class="action danger delete">삭제</button><div class="week-check">${days.map((d,i)=>`<label><input type="checkbox" value="${i}" ${e.days?.includes(i)?'checked':''}> ${d}요일</label>`).join('')}</div>`;el.querySelector('.delete').onclick=()=>el.remove();$('rows').append(el)}

 function noticeRow(n={title:'',body:'',date:'',pinned:false}){
   const el=document.createElement('div');el.className='notice-edit-card';
   el.innerHTML='<div class="notice-edit-head"><strong>공지사항</strong><button type="button" class="action danger notice-delete">삭제</button></div>'
      +'<div class="field"><label>제목</label><input class="notice-title" maxlength="100" placeholder="공지 제목" style="width:100%"></div>'
      +'<div class="field"><label>내용</label><textarea class="notice-body" maxlength="3000" rows="4" placeholder="공지 내용"></textarea></div>'
      +'<div class="notice-edit-options"><label>게시 날짜 <input type="date" class="notice-date"></label>'
      +'<label><input type="checkbox" class="notice-pinned"> 맨 위 고정 (중요)</label></div>';
   el.querySelector('.notice-title').value=n.title||'';
   el.querySelector('.notice-body').value=n.body||'';
   el.querySelector('.notice-date').value=n.date||'';
   el.querySelector('.notice-pinned').checked=!!n.pinned;
   el.querySelector('.notice-delete').onclick=()=>{if(confirm('이 공지를 삭제할까?'))el.remove()};
   $('noticeRows').append(el);
 }
 $('addNotice').onclick=()=>noticeRow({date:new Date().toLocaleDateString('en-CA')});


 function compactRow(kind, item={title:'',url:''}){
  const isVideo=kind==='video';const node=document.createElement('div');node.className='notice-edit-card';
  node.innerHTML='<div class="notice-edit-head"><strong>'+(isVideo?'유튜브 영상':'자료실 링크')+'</strong><button type="button" class="action danger item-delete">삭제</button></div>'+
   '<div class="field"><label>표시 제목</label><input class="item-title" maxlength="120" style="width:100%" placeholder="'+(isVideo?'공략 영상 제목':'자료 이름')+'"></div>'+
   '<div class="field"><label>'+ (isVideo?'유튜브 주소':'링크 주소') +'</label><input class="item-url" type="url" style="width:100%" placeholder="https://..."></div>';
  node.querySelector('.item-title').value=item.title||'';node.querySelector('.item-url').value=item.url||(isVideo&&item.id?'https://www.youtube.com/watch?v='+item.id:'');
  node.querySelector('.item-delete').onclick=()=>{if(confirm('이 항목을 삭제할까?'))node.remove()};
  $(isVideo?'videoRows':'linkRows').append(node);
 }
 $('addLink').onclick=()=>compactRow('link');$('addVideo').onclick=()=>compactRow('video');
 function validHttpUrl(v){try{const u=new URL(v);return (u.protocol==='https:'||u.protocol==='http:')&&Boolean(u.hostname)}catch{return false}}
 function youtubeId(v){try{const u=new URL(v);const h=u.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');let id='';if(h==='youtu.be')id=u.pathname.split('/')[1]||'';else if(['youtube.com','youtube-nocookie.com','music.youtube.com'].includes(h)){if(u.pathname==='/watch')id=u.searchParams.get('v')||'';else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split('/')[2]||'';}return /^[\w-]{11}$/.test(id)?id:null}catch{return null}}
 function gatherItems(id){return [...$(id).children].map(node=>({title:node.querySelector('.item-title').value.trim(),url:node.querySelector('.item-url').value.trim()}))}

 function populate(){document.querySelector('#rows').replaceChildren();$('note').value=original.note;
 $('quoteTitleInput').value=original.quoteTitle??'함께 즐기고 웃는 우리 문파';
 $('quoteSubtitleInput').value=original.quoteSubtitle??'✦ 즐거운 게임, 배려하는 소통 ✦';original.events.forEach(row);$('noticeRows').replaceChildren();(original.notices||[]).forEach(noticeRow);$('linkRows').replaceChildren();(original.resources||[]).forEach(x=>compactRow('link',x));$('videoRows').replaceChildren();(original.videos||window.PARTY_VIDEOS||[]).forEach(x=>compactRow('video',x))}populate();$('add').onclick=()=>row();$('reset').onclick=()=>{if(confirm('현재 파일에 저장된 기본 일정으로 되돌릴까?')){populate();$('status').textContent='기본 일정으로 되돌렸어.'}};
 const report=(message,element)=>{const status=$('status');status.textContent=message;status.style.color='#ffd29b';if(element){element.scrollIntoView({behavior:'smooth',block:'center'});element.focus?.()}else status.scrollIntoView({behavior:'smooth',block:'center'});alert(message)};
 const download=(name,blob)=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},10000)};
 function generateDataBlob(){try{const events=[...$('rows').children].map(el=>({days:[...el.querySelectorAll('input[type=checkbox]:checked')].map(x=>Number(x.value)),time:el.querySelector('.time').value,name:el.querySelector('.name').value.trim(),type:el.querySelector('.kind').value.trim()}));if(events.some(x=>!x.time||!x.name||!x.type||!x.days.length)){report('일정에 비어 있는 시간·이름·종류·요일이 있어. 확인해 줘.',$('rows'));return}const quoteTitle=$('quoteTitleInput').value.trim();
 const quoteSubtitle=$('quoteSubtitleInput').value.trim();
 if(!quoteTitle){report('문파 안내 상자의 큰 글씨를 입력해 줘.',$('quoteTitleInput'));return}
 const notices=[...$('noticeRows').children].map(el=>({title:el.querySelector('.notice-title').value.trim(),body:el.querySelector('.notice-body').value.trim(),date:el.querySelector('.notice-date').value,pinned:el.querySelector('.notice-pinned').checked}));
 if(notices.some(n=>!n.title||!n.body)){report('제목이나 내용이 빈 공지가 있어. 입력하거나 삭제해 줘.',$('noticeRows'));return}
 const resources=gatherItems('linkRows');const enteredVideos=gatherItems('videoRows');
 if(resources.some(x=>!x.title||!validHttpUrl(x.url))){report('자료실에 제목이 비었거나 주소가 잘못된 항목이 있어.',$('linkRows'));return}
 if(enteredVideos.some(x=>!x.title||!youtubeId(x.url))){report('유튜브 제목이나 주소가 잘못됐어. 유튜브 영상 주소의 v= 뒤 11자리 ID도 확인해 줘.',$('videoRows'));return}
 const videos=enteredVideos.map(x=>({title:x.title,id:youtubeId(x.url)}));
 const data={...original,quoteTitle,quoteSubtitle,note:$('note').value.trim(),image:original.image||'weekly.png',notices,events,resources,videos};const js='window.PARTY_DEFAULT = '+JSON.stringify(data,null,2)+';\n';return new Blob([js],{type:'text/javascript;charset=utf-8'});}catch(err){console.error(err);report('저장 중 오류: '+(err?.message||String(err)))} }

 $('exportData').onclick=()=>{const blob=generateDataBlob();if(blob){download('data.js',blob);$('status').textContent='data.js 다운로드를 요청했어. GitHub에 올려줘.'}};

 // Small self-contained ZIP writer (STORE method). No CDN or paid service required.
 const encoder=new TextEncoder();
 const crcTable=(()=>{const table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);table[i]=c>>>0}return table})();
 function crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=crcTable[(c^bytes[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
 function packZip(entries){const chunks=[],central=[];let pos=0;const push=(arr)=>{chunks.push(arr);pos+=arr.length};
 for(const [name,data] of entries){const label=encoder.encode(name),crc=crc32(data),offset=pos;
   const header=new Uint8Array(30+label.length),v=new DataView(header.buffer);
   v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);
   v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,label.length,true);header.set(label,30);push(header);push(data);
   const dir=new Uint8Array(46+label.length),d=new DataView(dir.buffer);
   d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);
   d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,label.length,true);d.setUint32(42,offset,true);dir.set(label,46);central.push(dir);
 }
 const dirStart=pos;for(const dir of central)push(dir);const directorySize=pos-dirStart;
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,directorySize,true);ev.setUint32(16,dirStart,true);push(end);
 return new Blob(chunks,{type:'application/zip'});
 }
 function pngFromImage(file){return new Promise(async(resolve,reject)=>{let bitmap;try{bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('이미지 변환에 실패했어.')),'image/png')}catch(e){if(bitmap)bitmap.close();reject(e)}})}
 $('exportBundle').onclick=async()=>{
   const button=$('exportBundle');const data=generateDataBlob();if(!data)return;
   try{button.disabled=true;button.textContent='ZIP 생성 중...';
      const entries=[['data.js',new Uint8Array(await data.arrayBuffer())]];
      const file=$('imageFile').files?.[0];
      if(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024)throw new Error('주간 플래너는 15MB 이하 PNG/JPG/WEBP만 가능해.');
         const image=await pngFromImage(file);entries.push(['weekly.png',new Uint8Array(await image.arrayBuffer())]);}
      download('party-updates.zip',packZip(entries));
      $('status').textContent='ZIP 다운로드를 요청했어! 압축을 풀고 '+entries.map(e=>e[0]).join(', ')+' 파일을 GitHub에 업로드해 줘.';
      $('status').style.color='#bfe2bd';
   }catch(e){console.error(e);report('ZIP 생성 오류: '+(e.message||String(e)))}
   finally{button.disabled=false;button.textContent='변경 파일 한 번에 ZIP 다운로드'}
 };
 $('imageFile').onchange=()=>{let f=$('imageFile').files?.[0];if(currentPreview)URL.revokeObjectURL(currentPreview);if(!f){$('exportImage').disabled=true;return}if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>15*1024*1024){alert('15MB 이하 PNG/JPG/WEBP 이미지로 선택해 줘.');$('imageFile').value='';return}currentPreview=URL.createObjectURL(f);$('preview').src=currentPreview;$('exportImage').disabled=false};
 $('exportImage').onclick=async()=>{try{const f=$('imageFile').files?.[0];if(!f)return;const bitmap=await createImageBitmap(f);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();canvas.toBlob(blob=>{if(!blob){alert('이미지 변환에 실패했어.');return}download('weekly.png',blob);$('status').textContent='weekly.png 다운로드 완료! GitHub에 업로드해 줘.'},'image/png')}catch(e){alert('이미지 처리 실패: '+e.message)}};
})();
