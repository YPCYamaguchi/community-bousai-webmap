# 防災ウェブマップ テンプレート

自治会・町内会向けの防災まち歩きウェブマップのテンプレートプロジェクトです。

Google スプレッドシートをバックエンドに、Leaflet.js で地図表示し、住民が気づきを写真付きで投稿・共有できるウェブアプリケーションです。

## 機能

- 防災関連施設（AED・消火栓・公共施設等）の地図表示
- 土砂災害警戒区域・急傾斜地等のハザードレイヤー
- 参加コードによるログイン
- 気づきの投稿（写真・カテゴリ・タグ・位置情報）
- いいね・コメント
- レスポンシブ対応（PC・スマートフォン）

## 技術スタック

| コンポーネント | 技術 |
|-------------|------|
| 地図 | Leaflet 1.9.4 |
| ベースマップ | OpenStreetMap / CARTO / 国土地理院 |
| バックエンド | Google Apps Script |
| データベース | Google スプレッドシート |
| 写真保存 | Google Drive |
| デプロイ | Netlify |

## クイックスタート

### 1. リポジトリをクローン

```bash
git clone https://github.com/YOUR_USERNAME/community-bousai-webmap.git
cd community-bousai-webmap
```

### 2. バックエンド（Google Apps Script）をセットアップ

[apps-script/SETUP.md](apps-script/SETUP.md) の手順に従ってください。

### 3. 設定ファイルを編集

`webapp/js/config.js` を開き、以下を設定:

```javascript
// 地区情報
const DISTRICT = {
    id: 'your-district',        // 英数字のID
    name: 'あなたの自治会名',
    subtitle: '防災ウェブマップ',
    contact: { ... },
};

// API URL（Apps Script のデプロイURL）
const API_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

// 地図の中心座標
const CONFIG = {
    map: {
        center: [緯度, 経度],
        zoom: 15,
    },
    layers: [ ... ],  // 地区のGeoJSONレイヤー
};
```

### 4. GeoJSON データを配置

`webapp/geojson/` ディレクトリに地区の GeoJSON ファイルを配置します。
`config.js` の `layers` 配列でファイルパスを指定してください。

### 5. ローカルで確認

```bash
cd webapp
npx serve .
```

### 6. Netlify にデプロイ

```bash
cd webapp
netlify deploy --prod
```

## ディレクトリ構成

```
community-bousai-webmap/
├── README.md
├── docs/                        # ドキュメント
│   └── CUSTOMIZATION.md
├── webapp/                      # フロントエンド（Netlifyにデプロイ）
│   ├── index.html               # 地図メイン
│   ├── login.html               # ログイン
│   ├── post.html                # 投稿作成
│   ├── list.html                # 投稿一覧
│   ├── detail.html              # 投稿詳細
│   ├── profile.html             # プロフィール
│   ├── js/
│   │   ├── config.js            # ★ 設定ファイル（ここだけ編集）
│   │   ├── app.js               # 地図ロジック
│   │   ├── api.js               # API通信
│   │   ├── auth.js              # セッション管理
│   │   ├── posts.js             # 投稿マーカー
│   │   └── username-generator.js
│   ├── css/
│   ├── geojson/                 # 地区の GeoJSON ファイル
│   └── netlify.toml
├── apps-script/                 # Google Apps Script
│   ├── Code.gs
│   ├── DriveHelper.gs
│   ├── appsscript.json
│   └── SETUP.md                 # セットアップ手順
└── examples/
    └── oimatsu/                 # 老松町内会の設定例
        ├── config.js
        └── geojson/
```

## カスタマイズ

新しい地区に対応する場合、**`webapp/js/config.js` の編集のみ**で対応できます。

詳細は [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) を参照してください。

## ライセンス

MIT
