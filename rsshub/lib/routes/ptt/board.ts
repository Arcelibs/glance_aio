import type { Route } from '@/types';
import { load } from 'cheerio';
import got from '@/utils/got';

const BASE_URL = 'https://www.ptt.cc';

export const route: Route = {
    path: '/board/:board',
    name: 'PTT 看板',
    maintainers: ['jimmy'],
    example: '/ptt/board/C_Chat',
    parameters: {
        board: '看板名稱，如 C_Chat、Gossiping',
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
            source: ['www.ptt.cc/bbs/:board/index.html'],
            target: '/ptt/board/:board',
        },
    ],
    handler,
};

async function handler(ctx) {
    const board = ctx.req.param('board');
    const boardUrl = `${BASE_URL}/bbs/${board}/index.html`;

    const response = await got(boardUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Cookie: 'over18=1',
        },
    });

    const $ = load(response.data);
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
            const title = link.text().trim();
            const author = row.find('.author').text().trim();
            const nrec = row.find('.nrec span').text().trim();
            const fullUrl = `${BASE_URL}${href}`;

            const description = [
                nrec ? `推文數：${nrec}` : '',
                author ? `作者：${author}` : '',
            ]
                .filter(Boolean)
                .join('　');

            return {
                title,
                link: fullUrl,
                description,
                pubDate: new Date(),
                guid: fullUrl,
            };
        })
        .filter(Boolean);

    return {
        title: boardTitle,
        link: boardUrl,
        item: items,
    };
}
