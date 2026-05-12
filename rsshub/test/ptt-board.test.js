/**
 * 驗證 PTT 看板解析邏輯
 * 直接抓取 PTT 頁面，測試核心爬取與解析行為
 */

import { load } from 'cheerio';

const BASE_URL = 'https://www.ptt.cc';
const TEST_BOARD = 'C_Chat';

function parseArticles(html) {
    const $ = load(html);
    const boardTitle = $('title').text().trim();

    const items = $('div.r-ent')
        .toArray()
        .map((el) => {
            const row = $(el);
            const link = row.find('.title a');
            if (!link.length) return null;

            const href = link.attr('href') ?? '';
            return {
                title: link.text().trim(),
                link: `${BASE_URL}${href}`,
                author: row.find('.author').text().trim(),
                nrec: row.find('.nrec span').text().trim(),
            };
        })
        .filter(Boolean);

    return { boardTitle, items };
}

function assert(condition, message) {
    if (!condition) {
        console.error(`  FAIL: ${message}`);
        process.exit(1);
    }
    console.log(`  PASS: ${message}`);
}

async function run() {
    console.log(`\n測試：PTT 看板 (board=${TEST_BOARD})\n`);

    const url = `${BASE_URL}/bbs/${TEST_BOARD}/index.html`;
    let html;
    try {
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RSSHub-test/1.0)',
                Cookie: 'over18=1',
            },
        });
        assert(resp.ok, `HTTP ${resp.status} - 頁面可正常存取`);
        html = await resp.text();
    } catch (e) {
        console.warn(`  SKIP: 無法連線至 PTT（可能 IP 被封鎖）- ${e.message}`);
        console.log('\n測試跳過（網路限制）。\n');
        process.exit(0);
    }

    const { boardTitle, items } = parseArticles(html);

    assert(boardTitle.length > 0, `看板標題不為空（${boardTitle}）`);
    assert(items.length > 0, `解析到至少一篇文章（共 ${items.length} 篇）`);

    const firstItem = items[0];
    assert(firstItem.title.length > 0, `第一篇標題不為空（${firstItem.title}）`);
    assert(firstItem.link.startsWith(BASE_URL), `文章連結格式正確（${firstItem.link}）`);
    assert(firstItem.author.length > 0, `第一篇作者不為空（${firstItem.author}）`);

    console.log(`\n全部測試通過。\n`);
}

run();
