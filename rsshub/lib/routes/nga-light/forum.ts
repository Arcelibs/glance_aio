import type { Route } from '@/types';
import got from '@/utils/got';
import { s2t, s2tItems } from '@/utils/s2t';

const API_URL = 'https://ngabbs.com/app_api.php';
const BASE_URL = 'https://bbs.nga.cn';

export const route: Route = {
    path: '/forum/:fid',
    name: 'NGA 板塊（輕量版）',
    maintainers: ['jimmy'],
    example: '/nga-light/forum/854',
    parameters: {
        fid: '板塊 ID，從網址 thread.php?fid=XXXXX 取得',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    handler,
};

async function handler(ctx) {
    const fid = ctx.req.param('fid');
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await got.post(`${API_URL}?__lib=subject&__act=list`, {
        headers: {
            'X-User-Agent': 'NGA_skull/6.0.5(iPhone10,3;iOS 12.0.1)',
            Cookie: `guestJs=${timestamp}`,
        },
        form: {
            fid,
            page: 1,
        },
    });

    const data = response.data as Record<string, unknown>;
    const result = data.result as Record<string, unknown>;
    const forumName = (data.forumname as string) ?? `NGA-${fid}`;
    const threads = (result?.data as Record<string, unknown>[]) ?? [];

    const items = threads
        .filter((t) => t.tid)
        .map((t) => {
            const tid = t.tid as string;
            const subject = (t.subject as string) ?? '(無標題)';
            const postdate = t.postdate as number;

            return {
                title: subject,
                link: `${BASE_URL}/read.php?tid=${tid}`,
                description: subject,
                pubDate: new Date(postdate * 1000),
                guid: `nga-${tid}`,
            };
        });

    const doS2t = ctx.req.query('s2t') === '1';

    return {
        title: doS2t ? s2t(forumName) : forumName,
        link: `${BASE_URL}/thread.php?fid=${fid}`,
        item: doS2t ? s2tItems(items) : items,
    };
}
