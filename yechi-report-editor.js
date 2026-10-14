(function(){
  'use strict';
  const input=document.getElementById('yechiImageInput');
  const preview=document.getElementById('yechiImagePreview');
  const button=document.getElementById('yechiImageDownload');
  const status=document.getElementById('yechiImageStatus');
  if(!input||!preview||!button)return;
  let output=null,prevUrl=null;
  input.addEventListener('change',async function(){
    output=null;button.disabled=true;
    const file=input.files&&input.files[0];if(!file)return;
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){status.textContent='JPG·PNG·WebP 이미지 파일만 선택해 줘.';return;}
    if(file.size>25*1024*1024){status.textContent='25MB 이하 이미지를 선택해 줘.';return;}
    status.textContent='이미지를 최적화하는 중…';
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
      const scale=Math.min(1,1500/img.naturalWidth,2100/img.naturalHeight);
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      output=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('이미지 변환 실패')),'image/jpeg',0.9));
      if(prevUrl)URL.revokeObjectURL(prevUrl);prevUrl=URL.createObjectURL(output);preview.src=prevUrl;
      button.disabled=false;status.textContent='준비 완료! 이미지 저장 파일을 다운로드한 뒤 GitHub에 올려야 홈페이지에 반영돼.';
    }catch(e){status.textContent='사진을 읽지 못했어. 다른 이미지로 다시 시도해 줘.';}
    finally{URL.revokeObjectURL(url);}
  });
  button.addEventListener('click',function(){
    if(!output)return;
    const url=URL.createObjectURL(output);const a=document.createElement('a');a.href=url;a.download='yechi-report.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    status.textContent='yechi-report.jpg 다운로드 완료. GitHub 저장소 최상위에서 동일한 이름의 파일을 교체하고 Commit changes를 눌러줘.';
  });
})();
