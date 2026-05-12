# Glance + RSSHub container deployment

這個 repo 只負責把 Glance config 和自訂 RSSHub 打包成容器 image，推到 GitHub Container Registry，然後透過 SSH 更新 VPS 上的 containers。

Caddy 反向代理請放在另一個 proxy repo 管理，並讓 Caddy 與本 repo 的 containers 共用同一個 Docker network：`arcelibs-proxy`。

## 架構

```text
Cloudflare DNS
  -> VPS public IP
    -> Caddy repo :80/:443
      -> glance container:8080
      -> rsshub container:1200
```

本 repo 不需要在 VPS clone，也不需要 VPS 上放 `.env` 或 compose file。

## 目錄

```text
.
├── glance/
│   ├── Dockerfile
│   └── data/glance.yml
├── rsshub/
│   ├── Dockerfile
│   ├── package.json
│   ├── lib/
│   └── test/
└── .github/workflows/deploy.yml
```

## GitHub Secrets

在這個 repo 設定：

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `VPS_SSH_KEY`
- `RSSHUB_ACCESS_KEY`

`RSSHUB_ACCESS_KEY` 要和 `glance/data/glance.yml` 裡 RSSHub feed URL 的 `key=...` 一致。

## 部署流程

push 到 `main` 後，GitHub Actions 會：

1. 跑 RSSHub 測試。
2. Build 並 push images：
   - `ghcr.io/<owner>/<repo>/glance:latest`
   - `ghcr.io/<owner>/<repo>/rsshub:latest`
3. SSH 到 VPS。
4. 自動建立 `arcelibs-proxy` network，如果不存在。
5. Pull 最新 images。
6. 重建 `glance` 和 `rsshub` containers。

VPS 不需要先建立 `/opt/apps/glance`。

## VPS 需求

VPS 只需要安裝 Docker，並允許 GitHub Actions 用 SSH 連線。workflow 會在每次部署時用 GitHub token 登入 GHCR，所以不需要先在 VPS clone repo、建立 compose file，或手動 docker login。

## Proxy repo 需要的 Caddy 設定

另一個 Caddy/proxy repo 的 `Caddyfile` 可加入：

```caddyfile
glance.arcelibs.com {
    reverse_proxy glance:8080
}

rss.arcelibs.com {
    reverse_proxy rsshub:1200
}
```

Caddy container 也要加入同一個 external network：

```yaml
networks:
  proxy:
    external: true
    name: arcelibs-proxy
```

## RSSHub access key

舊 key 已經出現在原本的 repo 檔案中，請改用新 key。

更新 key 時需要同步改兩個地方：

- GitHub secret `RSSHUB_ACCESS_KEY`
- `glance/data/glance.yml` 裡 RSSHub feed URL 的 `key=...`
