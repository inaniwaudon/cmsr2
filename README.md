# cmsr2

Cloudflare R2 を CMS として使うための簡易的な API とフロントエンドです。
Web サイトのビルド時に API 経由で fetch して、静的コンテンツとして注入することを想定しています。

## 開発

```bash
cd frontend
yarn run watch

cd hono
yarn run dev     # localhost:8787 でサーバを起動
yarn run deploy  # Cloudflare Workers にデプロイ
```

## 使用方法

### フロントエンドを介した利用

1. `Secrets` に `AUTH_TOKEN` を保存する

```.dev.vars
AUTH_TOKEN="<TOKEN>"
```

2. `/set-token/:TOKEN` にアクセスして、トークンを Cookie に保存する

### API 経由での利用

Authorization ヘッダを付与して、以下のエンドポイントを呼び出します。

- GET `/api/lists/:key`  
  `key` に先頭一致するファイル一覧を取得。`key` が指定されない場合は全ファイルを取得
- GET `/api/files/:key`  
  `key` のテキストファイルを取得
- PUT `/api/files/:key`  
  `key` にテキストファイルを作成／更新（upsert）
- DELETE `/api/files/:key`  
  `key` のファイルを削除
- POST `/api/mv`  
  ファイルを移動。`"Content-Type": "application/json"` として `{ "srcKey": "<移動前のキー>", "<移動後のキー>" }` を指定

#### Node.js から Markdown ファイルを取得する例

実際の運用例は [inaniwaudon-minna2](https://github.com/inaniwaudon-minna2) を参照。

```ts
const fetchData = async (path: string) => {
  const url = new URL(`/api/files/web/${path}`, cmsUrl);
  const response = await fetch(url, {
    headers: {
      Authorization: "<TOKEN>",
    },
  });
  return await response.text();
};
```
