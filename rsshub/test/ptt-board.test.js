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

            if (!link.length) {
                return null;
            }

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
    console.log(`\nTest PTT board parsing (board=${TEST_BOARD})\n`);

    const url = `${BASE_URL}/bbs/${TEST_BOARD}/index.html`;
    let html;

    try {
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RSSHub-test/1.0)',
                Cookie: 'over18=1',
            },
        });

        assert(resp.ok, `HTTP ${resp.status} - source page is reachable`);
        html = await resp.text();
    } catch (e) {
        console.warn(`  SKIP: cannot reach PTT - ${e.message}`);
        process.exit(0);
    }

    const { boardTitle, items } = parseArticles(html);

    assert(boardTitle.length > 0, `board title is present: ${boardTitle}`);
    assert(items.length > 0, `parsed article count is greater than zero: ${items.length}`);

    const firstItem = items[0];
    assert(firstItem.title.length > 0, `first item title is present: ${firstItem.title}`);
    assert(firstItem.link.startsWith(BASE_URL), `first item link is absolute: ${firstItem.link}`);
    assert(firstItem.author.length > 0, `first item author is present: ${firstItem.author}`);

    console.log('\nPTT parser test completed.\n');
}

run();
