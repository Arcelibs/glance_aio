# Glance + RSSHub image publishing

這個 repo 只負責測試、build，並把 Glance 與自訂 RSSHub 推到 GitHub Container Registry。實際部署由家裡 Linux VM 上的 Cloudflare Tunnel 和 Watchtower 處理，不需要 VPS、公網 IP、Caddy、SSH deploy，也不需要在機器上 clone 這個 repo。

## Images

GitHub Actions 會發布：

```text
ghcr.io/arcelibs/glance_aio/glance:latest
ghcr.io/arcelibs/glance_aio/rsshub:latest
```

Images 會發布 `linux/amd64` 和 `linux/arm64`，適合一般 x86 Ubuntu Server / VPS，也可以原生跑在 Apple Silicon，例如 Mac mini M4。

建議把 GHCR packages 設為 public，這樣家裡 VM 和 Watchtower 不需要登入 GHCR。

## Mac mini M4 本機啟動

Mac mini M4 是 ARM64，建議使用 multi-arch image 原生執行，不需要加 `--platform linux/amd64`。macOS 沒有 Linux VM 常用的 `/etc/timezone` 和 `/etc/localtime` 掛載方式，建議改用 `TZ` 環境變數。

建立共用 Docker network：

```bash
docker network create arcelibs
```

啟動 Glance：

```bash
docker run -d \
  --name glance \
  --restart unless-stopped \
  --network arcelibs \
  -e TZ=Asia/Taipei \
  -p 8080:8080 \
  ghcr.io/arcelibs/glance_aio/glance:latest
```

啟動 RSSHub：

```bash
docker run -d \
  --name rsshub \
  --restart unless-stopped \
  --network arcelibs \
  -e NODE_ENV=production \
  -e CACHE_TYPE=memory \
  -e CACHE_EXPIRE=600 \
  -e TZ=Asia/Taipei \
  -p 1200:1200 \
  ghcr.io/arcelibs/glance_aio/rsshub:latest
```

如果是接 Cloudflare Tunnel，可以移除 `-p`，並讓 `cloudflared` 加入同一個 `arcelibs` network。

## 家裡 VM 初次啟動

建立共用 Docker network：

```bash
docker network create arcelibs
```

啟動 Glance：

```bash
docker run -d \
  --name glance \
  --restart unless-stopped \
  --network arcelibs \
  -v /etc/timezone:/etc/timezone:ro \
  -v /etc/localtime:/etc/localtime:ro \
  ghcr.io/arcelibs/glance_aio/glance:latest
```

啟動 RSSHub：

```bash
docker run -d \
  --name rsshub \
  --restart unless-stopped \
  --network arcelibs \
  -e NODE_ENV=production \
  -e CACHE_TYPE=memory \
  -e CACHE_EXPIRE=600 \
  ghcr.io/arcelibs/glance_aio/rsshub:latest
```

啟動 Watchtower，自動更新這兩個 containers：

```bash
docker run -d \
  --name watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  glance rsshub \
  --interval 300 \
  --cleanup
```

## Cloudflare Tunnel

在 Cloudflare Zero Trust 建立 Tunnel，並用 cloudflared container 跑在同一個 Docker network。

Public Hostnames 設定：

```text
glance.arcelibs.com -> http://glance:8080
rss.arcelibs.com    -> http://rsshub:1200
```

cloudflared container 也要加入同一個 network：

```bash
docker network connect arcelibs cloudflared
```

如果是用 Cloudflare 後台提供的 docker run 指令啟動 tunnel，請加上：

```bash
--network arcelibs
```

## GitHub Actions

push 到 `main` 後會執行：

1. RSSHub tests
2. build/push Glance image
3. build/push RSSHub image

不需要任何 VPS SSH secrets。

## RSSHub Key

目前不使用 RSSHub query key。Cloudflare Tunnel 是唯一公開入口；如果之後需要限制存取，建議用 Cloudflare Access 或 Tunnel policy，而不是把 key 寫進 Glance config。
