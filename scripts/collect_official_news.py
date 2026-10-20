#!/usr/bin/env python3
"""Collect official notice links; preserve existing data on every failed run."""
import asyncio
import datetime
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

URL = 'https://forum.kakaogames.com/dokkaebi/postList/?code=notice'
OUTPUT = Path('official-news.json')
DEBUG = Path('official-news-debug')
ATTEMPTS = 3
WAIT_SECONDS = 35
LINKS_JS = """els => els.map(a => ({
    title: (a.innerText || a.textContent || a.getAttribute('title') || '').trim(),
    url: a.href
})).filter(x => x.title && x.url)"""


def canonical_url(url):
    p = urlparse(urljoin(URL, url))
    q = parse_qs(p.query)
    ids = q.get('id', [])
    if (p.scheme == 'https' and p.netloc == 'forum.kakaogames.com'
            and p.path.rstrip('/') == '/dokkaebi/postView'
            and q.get('code') == ['notice'] and len(ids) == 1
            and ids[0].isdigit()):
        return 'https://forum.kakaogames.com/dokkaebi/postView/?' + urlencode(
            {'code': 'notice', 'id': ids[0]})
    return None


def extract_items(rows):
    items, seen = [], set()
    for row in rows:
        title = re.sub(r'\s+', ' ', row.get('title', '')).strip()
        url = canonical_url(row.get('url', ''))
        if url and url not in seen and 4 <= len(title) <= 180:
            seen.add(url)
            items.append({'title': title, 'url': url})
    return items[:12]


async def collect_page(page):
    response = await page.goto(URL, wait_until='domcontentloaded', timeout=45000)
    status = response.status if response else None
    print(f'HTTP status: {status}; page: {page.url}', flush=True)
    if not response or status >= 400:
        raise RuntimeError(f'Official site returned HTTP {status}')
    # Poll for valid notice links, not an arbitrary fixed render delay.
    for elapsed in range(WAIT_SECONDS + 1):
        items = extract_items(await page.locator('a').evaluate_all(LINKS_JS))
        if items:
            return items
        if elapsed < WAIT_SECONDS:
            await page.wait_for_timeout(1000)
    raise RuntimeError('No valid official notice links after 35 seconds')


async def save_debug(page, attempt, error):
    DEBUG.mkdir(exist_ok=True)
    info = {'attempt': attempt, 'error': str(error), 'url': page.url}
    # Each diagnostic is independent so screenshot failure cannot hide the cause.
    try:
        info['page_title'] = await page.title()
        info['anchors'] = await page.locator('a').count()
        info['body_excerpt'] = (await page.locator('body').inner_text(timeout=5000))[:2000]
    except Exception as exc:
        info['inspection_error'] = str(exc)
    for name, operation in [
        ('html', lambda: page.content()),
        ('png', lambda: page.screenshot(path=str(DEBUG / f'attempt-{attempt}.png'),
                                        full_page=True, timeout=10000)),
    ]:
        try:
            result = await operation()
            if name == 'html':
                (DEBUG / f'attempt-{attempt}.html').write_text(result, encoding='utf-8')
        except Exception as exc:
            info[name + '_error'] = str(exc)
    (DEBUG / f'attempt-{attempt}.json').write_text(
        json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')


def write_items(items):
    if not items:
        raise ValueError('Refusing to replace existing notices with an empty list')
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    temp = OUTPUT.with_suffix('.json.tmp')
    temp.write_text(json.dumps({'updated_at': now, 'items': items},
                               ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(OUTPUT)


def summary(message):
    print(message, flush=True)
    path = os.environ.get('GITHUB_STEP_SUMMARY')
    if path:
        with open(path, 'a', encoding='utf-8') as handle:
            handle.write(message + '\n')


async def collect_with_retries(browser):
    last_error = None
    for attempt in range(1, ATTEMPTS + 1):
        page = await browser.new_page(locale='ko-KR', timezone_id='Asia/Seoul',
                                      viewport={'width': 1440, 'height': 900})
        try:
            print(f'Collection attempt {attempt}/{ATTEMPTS}', flush=True)
            return await collect_page(page)
        except Exception as exc:
            last_error = exc
            print(f'Attempt {attempt} failed: {exc}', flush=True)
            await save_debug(page, attempt, exc)
        finally:
            await page.close()
        if attempt < ATTEMPTS:
            await asyncio.sleep(5 * attempt)
    raise RuntimeError(f'All {ATTEMPTS} attempts failed: {last_error}')


async def run():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            items = await collect_with_retries(browser)
            write_items(items)
            summary(f'공식 공지 {len(items)}개 확인 완료. official-news.json 갱신.')
        finally:
            await browser.close()


if __name__ == '__main__':
    try:
        asyncio.run(run())
    except Exception as exc:
        summary('공식 공지 갱신 실패. 기존 공지와 마지막 확인 시각은 유지됩니다. '
                'Artifacts의 official-news-debug를 확인하세요.')
        message = str(exc).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
        print(f'::error::{message}', flush=True)
        sys.exit(1)
