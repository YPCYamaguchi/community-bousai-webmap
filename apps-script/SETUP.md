# Apps Script セットアップ手順

## 1. Google スプレッドシートを作成

新しいスプレッドシートを作成し、以下の **6つのシート** を追加してください。

### シート構成

| シート名 | 列（1行目にヘッダーを入力） |
|---------|--------------------------|
| **posts** | id, timestamp, lat, lng, category, tags, title, description, photo_full, photo_thumb, user_id, user_name, group, event_code, status |
| **users** | user_id, user_name, group, created_at, last_login |
| **likes** | post_id, user_id, user_name, timestamp |
| **comments** | id, post_id, user_id, user_name, text, timestamp, status |
| **events** | code, name, description, active |
| **config** | key, value |

### config シートの初期データ

| key | value |
|-----|-------|
| admin_key | （任意の管理者パスワード） |
| drive_folder_id | （Google Drive フォルダのID — 下記参照） |

### events シートの初期データ

| code | name | description | active |
|------|------|-------------|--------|
| test123 | テスト | テスト用参加コード | TRUE |

## 2. Google Drive フォルダを作成

1. Google Drive で写真保存用のフォルダを作成
2. フォルダを開き、URLからフォルダIDを取得
   ```
   https://drive.google.com/drive/folders/XXXXXXXXXX
                                          ^^^^^^^^^^
                                          このIDをコピー
   ```
3. config シートの `drive_folder_id` にこのIDを入力

## 3. Apps Script プロジェクトを開く

1. 作成したスプレッドシートを開く
2. メニューの **拡張機能 → Apps Script** をクリック

## 4. コードを貼り付ける

### Code.gs
- 既存の `Code.gs` の内容を全て削除し、`Code.gs` ファイルの内容を貼り付け

### DriveHelper.gs
- 左のファイル一覧の **＋** → **スクリプト** をクリック
- ファイル名を `DriveHelper` に変更（.gs は自動付与）
- `DriveHelper.gs` ファイルの内容を貼り付け

### appsscript.json
- 左の **⚙ プロジェクトの設定** をクリック
- **「appsscript.json」マニフェスト ファイルをエディタで表示する** にチェックを入れる
- エディタに戻り、`appsscript.json` の内容を貼り付け

## 5. スクリプトプロパティを設定

1. **⚙ プロジェクトの設定** をクリック
2. **スクリプト プロパティ** セクションで **プロパティを追加**
3. 以下を設定:
   - **プロパティ**: `SS_ID`
   - **値**: スプレッドシートのID（URLの `/d/` と `/edit` の間の文字列）

## 6. Web App としてデプロイ

1. 右上の **デプロイ → 新しいデプロイ** をクリック
2. **種類の選択（⚙）** → **ウェブアプリ** を選択
3. 以下のように設定:
   - **説明**: `防災まち歩きAPI v1`
   - **次のユーザーとして実行**: `自分`
   - **アクセスできるユーザー**: `全員`
4. **デプロイ** をクリック
5. 初回は権限の承認を求められるので **アクセスを許可** をクリック
   - 「このアプリは確認されていません」と表示された場合 → **詳細** → **（安全ではないページ）に移動**
6. 表示された **ウェブアプリの URL** をコピーして保存

```
https://script.google.com/macros/s/XXXXXXXXXX/exec
```

→ この URL をフロントエンドの `webapp/js/config.js` の `API_URL` に設定します。

## 7. 動作テスト

ブラウザで以下のURLにアクセスし、JSON が返ることを確認:

```
https://script.google.com/macros/s/XXXXXXXXXX/exec?action=getPosts
```

期待されるレスポンス:
```json
{"status":"ok","posts":[],"count":0}
```

## 8. コード更新時の再デプロイ

コードを修正したら:
1. **デプロイ → デプロイを管理** をクリック
2. 右上の **✏（鉛筆アイコン）** をクリック
3. **バージョン** を **新しいバージョン** に変更
4. **デプロイ** をクリック

> URL は変わりません。ただし「新しいバージョン」にしないと変更が反映されません。
