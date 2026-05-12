import type { Route } from '@/types';
import { load } from 'cheerio';
import got from '@/utils/got';
import { s2t, s2tItems } from '@/utils/s2t';

const BASE_URL = 'https://forum.gamer.com.tw';

export const route: Route = {
    path: '/bbs/:bsn',
    name: '哈啦板',
    maintainers: ['jimmy'],
    example: '/gamer/bbs/60030',
    parameters: {
        bsn: '看板編號，可從板塊網址 B.php?bsn=XXXXX 取得',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['forum.gamer.com.tw/B.php'],
            target: '/gamer/bbs/:bsn',
        },
    ],
    handler,
};

async function handler(ctx) {
    const bsn = ctx.req.param('bsn');
    const boardUrl = `${BASE_URL}/B.php?bsn=${bsn}`;

    const response = await got(boardUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });

    const $ = load(response.data);
    const boardTitle = $('title').text().trim();

    const now = Date.now();
    const items = $('tr.b-list__row')
        .toArray()
        .filter((el) => !$(el).hasClass('b-list__row--sticky'))
        .map((el, index) => {
            const row = $(el);

            // 主連結（C.php，排除 last=1 的最新回覆連結）
            const mainLink = row
                .find('a[href^="C.php"]')
                .toArray()
                .find((a) => !$(a).attr('href')?.includes('last=1'));

            if (!mainLink) {
                return null;
            }

            const href = $(mainLink).attr('href') ?? '';
            const fullUrl = `${BASE_URL}/${href}`;

            const title = row.find('p.b-list__main__title').text().trim() || '(無標題)';
            const brief = row.find('p.b-list__brief').text().trim();
            const thumbnail = row.find('div.b-list__img').attr('data-thumbnail') ?? '';

            const description = thumbnail
                ? `<img src="${thumbnail}" /><br/>${brief}`
                : brief;

            return {
                title,
                link: fullUrl,
                description,
                pubDate: new Date(now - index * 60000),
                guid: fullUrl,
            };
        })
        .filter(Boolean);

    const doS2t = ctx.req.query('s2t') === '1';

    return {
        title: doS2t ? s2t(boardTitle) : boardTitle,
        link: boardUrl,
        item: doS2t ? s2tItems(items as Record<string, unknown>[]) : items,
    };
}
