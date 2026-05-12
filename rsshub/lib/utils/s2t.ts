import { Converter } from 'opencc-js';

const convert = Converter({ from: 'cn', to: 'twp' });

export function s2t(text: string): string {
    return convert(text);
}

/**
 * 將 RSS item 的 title 和 description 從簡體轉為繁體
 */
export function s2tItems(items: Record<string, unknown>[]): Record<string, unknown>[] {
    return items.map((item) => ({
        ...item,
        title: typeof item.title === 'string' ? s2t(item.title) : item.title,
        description: typeof item.description === 'string' ? s2t(item.description) : item.description,
    }));
}
