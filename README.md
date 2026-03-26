# 釣り天気アプリ セットアップ

## ファイル構成
```
fishing-app/
├── index.html      ← 動作確認ページ（後でUI本体に差し替え）
├── package.json
├── vercel.json
├── spots.json      ← 釣り場マスター
└── api/
    ├── weather.js  ← 気象庁プロキシ
    ├── tide.js     ← 潮汐プロキシ
    └── sun.js      ← 日の出・日没計算
```

## デプロイ手順

```bash
# 1. Vercel CLIインストール（初回のみ）
npm i -g vercel

# 2. このフォルダに移動
cd fishing-app

# 3. デプロイ（初回はGitHubログインを求められる）
vercel

# 4. 本番デプロイ
vercel --prod
```

## 動作確認

デプロイ後に以下のURLを確認：

```
https://あなたのURL.vercel.app/          ← 動作確認ページ
https://あなたのURL.vercel.app/api/weather?code=300000  ← 気象庁JSON
https://あなたのURL.vercel.app/api/sun?lat=33.477&lon=135.856  ← 日の出
```

## 次のステップ

1. `vercel` コマンドでデプロイ
2. ブラウザで動作確認ページを開く
3. ✅ が出たら成功
4. tide736.netで串本のportコードを確認 → tide.jsに設定
5. UIをfishing-app-v2.htmlの内容に差し替え
