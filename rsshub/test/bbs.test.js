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

            if (!mainLink) {
                return null;
            }

            const href = $(mainLink).attr('href') ?? '';
            const brief = row.find('p.b-list__brief').text().trim();
            const thumbnail = row.find('div.b-list__img').attr('data-thumbnail') ?? '';

            return {
                title: row.find('p.b-list__main__title').text().trim() || '(no title)',
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
    console.log(`\nTest Bahamut board parsing (bsn=${TEST_BSN})\n`);

    const url = `${BASE_URL}/B.php?bsn=${TEST_BSN}`;
    let html;

    try {
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSSHub-test/1.0)' },
        });

        if (resp.status === 403) {
            console.warn('  SKIP: Bahamut returned 403 for this runner IP.');
            process.exit(0);
        }

        assert(resp.ok, `HTTP ${resp.status} - source page is reachable`);
        html = await resp.text();
    } catch (e) {
        console.warn(`  SKIP: cannot reach Bahamut - ${e.message}`);
        process.exit(0);
    }

    const { boardTitle, items } = parseArticles(html);

    assert(boardTitle.length > 0, `board title is present: ${boardTitle}`);
    assert(items.length > 0, `parsed article count is greater than zero: ${items.length}`);

    const firstItem = items[0];
    assert(firstItem.title.length > 0, `first item title is present: ${firstItem.title}`);
    assert(firstItem.link.startsWith(BASE_URL), `first item link is absolute: ${firstItem.link}`);
    assert(firstItem.description.length > 0, 'first item description is present');

    console.log('\nBahamut parser test completed.\n');
}

run();
