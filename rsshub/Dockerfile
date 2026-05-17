FROM node:22-alpine

WORKDIR /app

# Fetch RSSHub source, then inject custom routes.
RUN apk add --no-cache git build-base python3 && \
    git clone --depth 1 https://github.com/DIYgod/RSSHub .

COPY lib/routes/gamer/ lib/routes/gamer/
COPY lib/routes/ptt/ lib/routes/ptt/
COPY lib/routes/nga-light/ lib/routes/nga-light/
COPY lib/utils/s2t.ts lib/utils/s2t.ts

RUN corepack enable && pnpm install --frozen-lockfile && pnpm add opencc-js && pnpm run build

ENV NODE_ENV=production
ENV NODE_OPTIONS='--max-http-header-size=32768'

EXPOSE 1200

CMD ["node", "dist/index.mjs"]
