/**
 * 驗證巴哈姆特哈啦板解析邏輯
 * 不依賴 Docker，直接測試核心爬取與解析行為
 */

import { load } from 'cheerio';

const BASE_URL = 'https://forum.gamer.com.tw';
const TEST_BSN = '60030';

function parseArticles(html) {
    const $ = load(html);
    const boardTitle = $('title').text().trim();

    const items = $('tr.b-list__row')
        .toArray()
        .filter((el) => !$(el).hasClass('b-list__row--sticky'))
        .map((el) => {
            const row = $(el);
            const mainLink = row
                .find('a[href^="C.php"]')
                .toArray()
                .find((a) => !$(a).attr('href')?.includes('last=1'));

            if (!mainLink) return null;

            const href = $(mainLink).attr('href') ?? '';
            const brief = row.find('p.b-list__brief').text().trim();
            const thumbnail = row.find('div.b-list__img').attr('data-thumbnail') ?? '';
            return {
                title: row.find('p.b-list__main__title').text().trim() || '(無標題)',
                link: `${BASE_URL}/${href}`,
                description: thumbnail ? `<img src="${thumbnail}"/><br/>${brief}` : brief,
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
    console.log(`\n測試：巴哈姆特哈啦板 (bsn=${TEST_BSN})\n`);

    // 抓取頁面
    const url = `${BASE_URL}/B.php?bsn=${TEST_BSN}`;
    let html;
    try {
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSSHub-test/1.0)' },
        });
        assert(resp.ok, `HTTP ${resp.status} - 頁面可正常存取`);
        html = await resp.text();
    } catch (e) {
        console.error(`  FAIL: 無法連線至巴哈姆特 - ${e.message}`);
        process.exit(1);
    }

    // 解析
    const { boardTitle, items } = parseArticles(html);

    assert(boardTitle.length > 0, `看板標題不為空（${boardTitle}）`);
    assert(items.length > 0, `解析到至少一篇文章（共 ${items.length} 篇）`);

    const firstItem = items[0];
    assert(firstItem.title.length > 0, `第一篇標題不為空（${firstItem.title}）`);
    assert(firstItem.link.startsWith(BASE_URL), `文章連結格式正確（${firstItem.link}）`);
    assert(firstItem.description.length > 0, `第一篇有內文預覽`);

    console.log(`\n全部測試通過。\n`);
}

run();
