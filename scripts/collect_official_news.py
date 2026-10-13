#!/usr/bin/env python3
"""Collect only announcement titles and official links; keep old JSON on errors."""
import asyncio,datetime,json,re,sys
from pathlib import Path
from urllib.parse import urljoin,urlparse,parse_qs
from playwright.async_api import async_playwright
URL='https://forum.kakaogames.com/dokkaebi/postList/?code=notice'
OUTPUT=Path('official-news.json')
def valid(url):
 p=urlparse(url)
 return p.scheme=='https' and p.netloc=='forum.kakaogames.com' and p.path.rstrip('/')=='/dokkaebi/postView' and parse_qs(p.query).get('code')==['notice'] and bool(parse_qs(p.query).get('id'))
async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
  page=await browser.new_page(locale='ko-KR',timezone_id='Asia/Seoul',viewport={'width':1440,'height':900})
  try:
   response=await page.goto(URL,wait_until='domcontentloaded',timeout=45000)
   if not response or response.status>=400: raise RuntimeError(f'Official site returned {response.status if response else "no response"}')
   await page.wait_for_timeout(6500)
   # The forum can be client-rendered. Extract actual announced post links only.
   rows=await page.locator('a').evaluate_all("els => els.map(a => ({title:(a.innerText||a.getAttribute('title')||'').trim(),url:a.href})).filter(x=>x.title&&x.url)")
   items=[];seen=set()
   for row in rows:
    title=re.sub(r'\s+',' ',row['title']).strip()
    url=urljoin(URL,row['url'])
    if not valid(url) or url in seen or len(title)<4 or len(title)>180:continue
    seen.add(url);items.append({'title':title,'url':url})
   if not items:
    await page.screenshot(path='official-news-debug.png',full_page=True)
    raise RuntimeError('No official announcement links were exposed in the page; existing JSON preserved')
   now=datetime.datetime.now(datetime.timezone.utc).isoformat()
   OUTPUT.write_text(json.dumps({'updated_at':now,'items':items[:12]},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   print('Collected',len(items),'official notices')
  finally:await browser.close()
if __name__=='__main__':asyncio.run(run())
