# カスタマイズガイド

## 設定ファイル（config.js）のみで変更できる項目

`webapp/js/config.js` を編集するだけで、以下の全てをカスタマイズできます。

### DISTRICT（地区情報）

| プロパティ | 説明 | 例 |
|-----------|------|-----|
| `id` | localStorage キーの接頭辞（英数字） | `'sakai-no-ya'` |
| `name` | ヘッダー・ログイン画面に表示 | `'境之谷東部自治会'` |
| `subtitle` | サブタイトル | `'防災ウェブマップ'` |
| `contact.label` | 連絡先名 | `'境之谷東部自治会 防災部'` |
| `contact.note` | 補足情報 | `'お問い合わせはXXXまで'` |
| `contact.phone` | 電話番号 | `'045-XXX-XXXX'` |
| `dataSource` | データ出典 | `'横浜市オープンデータ'` |
| `lastUpdated` | 最終更新日 | `'2026年4月10日'` |

### API_URL

Google Apps Script のウェブアプリ URL を設定します。
地区ごとに個別のスプレッドシートと Apps Script が必要です。

### CONFIG.map（地図設定）

| プロパティ | 説明 |
|-----------|------|
| `center` | `[緯度, 経度]` — 地図の初期中心 |
| `zoom` | 初期ズームレベル（推奨: 15） |

### CONFIG.layers（GeoJSONレイヤー）

レイヤーの追加・削除・変更が可能です。
**`index.html` の編集は不要です** — 施設一覧タブやトグルUIは `config.js` の設定から自動生成されます。

```javascript
{
    id: "unique_id",           // (必須) 一意のID
    name: "表示名",             // (必須) サイドパネルのトグルに表示する名前
    type: "point",             // (必須) "point" or "polygon"
    file: "geojson/xxx.geojson", // (必須) GeoJSON ファイルパス
    color: "#e53935",          // (必須) マーカー/ポリゴンの色
    iconClass: "fa-building",  // Font Awesome アイコン（point のみ）
    fillOpacity: 0.3,          // 塗り潰し透明度（polygon のみ）
    visible: true,             // 初期表示状態（省略時 false）
    listLabel: "公共施設",      // 施設一覧タブのラベル（省略→一覧に出さない）
    requireLogin: false,       // true にするとログイン時のみ表示（省略時 false）
    fitBounds: false           // true にすると初期表示時にこのレイヤーの範囲にフィット（省略時 false）
}
```

#### プロパティ詳細

| プロパティ | 必須 | 説明 |
|-----------|:----:|------|
| `id` | ○ | レイヤーの一意な識別子 |
| `name` | ○ | サイドパネルのトグルに表示する名前 |
| `type` | ○ | `"point"` または `"polygon"` |
| `file` | ○ | GeoJSON ファイルパス |
| `color` | ○ | マーカー / ポリゴンの色 |
| `iconClass` | | Font Awesome アイコンクラス（point のみ） |
| `fillOpacity` | | 塗り潰し透明度（polygon のみ） |
| `visible` | | `true` で初期表示ON。省略時 `false` |
| `listLabel` | | 施設一覧タブのラベル。省略するとそのレイヤーは一覧に表示されない。同じ値を複数レイヤーに指定すると1つのタブに統合される |
| `requireLogin` | | `true` にするとログイン時のみトグル・地図・一覧に表示。省略時 `false` |
| `fitBounds` | | `true` にすると初期表示時にこのレイヤーの範囲にフィット。複数指定時は全体を包含。省略時 `false` |

### CATEGORIES / TAGS / GROUPS

投稿のカテゴリ、タグ、グループを地区に合わせて変更できます。

## GeoJSON レイヤーの種類

レイヤーには **地区独自データ** と **全国共通データ** の2種類があります。

### 地区独自データ（各自治会で作成）

自治会のまち歩き・調査で収集するデータです。地区ごとに作成が必要です。

| レイヤー | 説明 | 収集方法 |
|---------|------|---------|
| AED | AED設置場所 | 現地調査、自治体公開情報 |
| 消火栓 | 消火栓・消火設備 | 現地調査、消防署情報 |
| 公共施設 | 自治会館・避難所等 | 自治会の既存資料 |
| 救護区画 | 災害時の救護エリア | 自治会の防災計画 |

### 全国共通データ（国土数値情報からダウンロード）

国土交通省の国土数値情報から全国どの地区でも取得できるデータです。

| レイヤー | データ識別子 | ダウンロードURL |
|---------|-----------|---------------|
| 土砂災害警戒区域 | A33 | https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A33-2024.html |
| 急傾斜崩壊危険区域 | A47 | https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A47-2021.html |
| 洪水浸水想定区域 | A31 | https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A31-v3_2.html |

#### 国土数値情報データの加工手順

1. 上記URLから対象都道府県のデータをダウンロード（GML/Shapefile形式）
2. QGIS 等のGISソフトで開く
3. 対象地区の範囲でクリップ（切り抜き）
4. GeoJSON 形式（EPSG:4326）でエクスポート
5. `webapp/geojson/` に配置

> **注意**: 国土数値情報のデータは都道府県単位で提供されるため、
> 自治会エリアに該当する範囲だけをクリップしてください。
> データが大きいとページ表示が遅くなります。

## GeoJSON ファイルの仕様

### ファイル形式

- GeoJSON 形式（`.geojson`）
- CRS: EPSG:4326（WGS84）
- 文字コード: UTF-8

### ポイントデータに必要なプロパティ

```json
{
  "type": "Feature",
  "properties": {
    "id": 1,
    "name": "施設名"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [経度, 緯度]
  }
}
```

### ポリゴンデータに必要なプロパティ

```json
{
  "type": "Feature",
  "properties": {
    "id": 1,
    "name": "区画名"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[経度, 緯度], ...]]
  }
}
```

## 新地区展開チェックリスト

### バックエンド
1. [ ] リポジトリをクローン
2. [ ] Google スプレッドシートを作成（[SETUP.md](../apps-script/SETUP.md) 参照）
3. [ ] Google Drive に写真用フォルダを作成
4. [ ] Apps Script をデプロイ
5. [ ] events シートに参加コードを追加

### 地図データ
6. [ ] 地区独自データを作成（AED・消火栓・公共施設・救護区画等）
7. [ ] 国土数値情報から全国共通データを取得・クリップ（土砂災害・急傾斜地等）
8. [ ] GeoJSON ファイルを `webapp/geojson/` に配置

### 設定・デプロイ
9. [ ] `config.js` の `DISTRICT` を編集
10. [ ] `config.js` の `API_URL` を設定
11. [ ] `config.js` の `CONFIG.map.center` を設定
12. [ ] `config.js` の `CONFIG.layers` を更新（地区独自 + 全国共通）
13. [ ] ローカルで動作確認（`npx serve webapp`）
14. [ ] Netlify にデプロイ
15. [ ] 動作テスト（ログイン → 投稿 → 確認）
