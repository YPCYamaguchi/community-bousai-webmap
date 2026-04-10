/**
 * 写真アップロード — Google Drive ヘルパー
 *
 * このファイルの内容を Apps Script エディタで
 * 新規ファイル「DriveHelper.gs」として追加してください。
 */

/**
 * フル画像とサムネイルを Google Drive にアップロードし、共有URLを返す
 * @param {string} postId    - 投稿ID（ファイル名に使用）
 * @param {string} fullB64   - フル解像度画像の Base64 文字列
 * @param {string} thumbB64  - サムネイル画像の Base64 文字列
 * @returns {{ fullUrl: string, thumbUrl: string }}
 */
function uploadPhotos_(postId, fullB64, thumbB64) {
  const rootFolderId = getConfigValue_('drive_folder_id');
  if (!rootFolderId) {
    throw new Error('drive_folder_id が config シートに設定されていません');
  }

  const rootFolder  = DriveApp.getFolderById(rootFolderId);
  const fullFolder  = getOrCreateFolder_(rootFolder, 'photos_full');
  const thumbFolder = getOrCreateFolder_(rootFolder, 'photos_thumb');

  let fullUrl  = '';
  let thumbUrl = '';

  if (fullB64) {
    const fullFile = fullFolder.createFile(
      base64ToBlob_(fullB64, postId + '_full.jpg')
    );
    setPublicView_(fullFile);
    fullUrl = 'https://lh3.googleusercontent.com/d/' + fullFile.getId();
  }

  if (thumbB64) {
    const thumbFile = thumbFolder.createFile(
      base64ToBlob_(thumbB64, postId + '_thumb.jpg')
    );
    setPublicView_(thumbFile);
    thumbUrl = 'https://lh3.googleusercontent.com/d/' + thumbFile.getId();
  }

  return { fullUrl: fullUrl, thumbUrl: thumbUrl };
}

/**
 * Base64 文字列を Blob に変換
 * data:image/jpeg;base64,... 形式���も対応
 */
function base64ToBlob_(b64, fileName) {
  const raw = b64.replace(/^data:image\/\w+;base64,/, '');
  const decoded = Utilities.base64Decode(raw);
  return Utilities.newBlob(decoded, 'image/jpeg', fileName);
}

/**
 * 子フォルダを取得 or 作成
 */
function getOrCreateFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/**
 * ファイルを「リンクを知っている全員が閲覧可能」に設定
 */
function setPublicView_(file) {
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
}
