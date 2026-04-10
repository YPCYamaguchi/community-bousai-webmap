/**
 * 防災まち歩きウェブマップ — Apps Script API
 *
 * スプレッドシートの「拡張機能 → Apps Script」から開き、
 * このファイルの内容を Code.gs に貼り付けてください。
 *
 * ※ スプレッドシート ID はスクリプトプロパティ 'SS_ID' に設定してください。
 *    設定方法: Apps Script エディタ → ⚙ プロジェクトの設定
 *    → スクリプト プロパティ → プロパティを追加
 *    → プロパティ名: SS_ID / 値: スプレッドシートのID
 */

// ============================================================
// 定数
// ============================================================
function getSsId_() {
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  if (!id) throw new Error('スクリプトプロパティ SS_ID が設定されていません');
  return id;
}

const SHEET = {
  POSTS:    'posts',
  USERS:    'users',
  LIKES:    'likes',
  COMMENTS: 'comments',
  EVENTS:   'events',
  CONFIG:   'config'
};

// posts シートのカラムインデックス (0始まり)
const P = {
  ID: 0, TIMESTAMP: 1, LAT: 2, LNG: 3, CATEGORY: 4, TAGS: 5,
  TITLE: 6, DESCRIPTION: 7, PHOTO_FULL: 8, PHOTO_THUMB: 9,
  USER_ID: 10, USER_NAME: 11, GROUP: 12, EVENT_CODE: 13, STATUS: 14
};

// ============================================================
// ヘルパー
// ============================================================
function getSheet_(name) {
  return SpreadsheetApp.openById(getSsId_()).getSheetByName(name);
}

function getConfigValue_(key) {
  const rows = getSheet_(SHEET.CONFIG).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) return rows[i][1];
  }
  return null;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isActiveCode_(code) {
  if (!code) return false;
  const rows = getSheet_(SHEET.EVENTS).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const active = rows[i][3] === true || String(rows[i][3]).toUpperCase() === 'TRUE';
    if (rows[i][0] === code && active) return true;
  }
  return false;
}

function isUserNameAvailable_(name) {
  if (!name || name.trim() === '') return false;
  const rows = getSheet_(SHEET.USERS).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === name) return false;
  }
  return true;
}

function nowISO_() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// ============================================================
// エントリポイント
// ============================================================
function doGet(e) {
  try {
    const action = (e.parameter || {}).action;
    if (action === 'getPosts') return handleGetPosts_(e);
    return json_({ status: 'error', message: 'unknown_action' });
  } catch (err) {
    return json_({ status: 'error', message: err.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    switch (data.action) {
      case 'verifyCode':    return handleVerifyCode_(data);
      case 'checkUserName': return handleCheckUserName_(data);
      case 'registerUser':  return handleRegisterUser_(data);
      case 'relogin':       return handleRelogin_(data);
      case 'addPost':       return handleAddPost_(data);
      case 'toggleLike':    return handleToggleLike_(data);
      case 'addComment':    return handleAddComment_(data);
      case 'hidePost':      return handleHidePost_(data);
      case 'hideComment':   return handleHideComment_(data);
      default:
        return json_({ status: 'error', message: 'unknown_action' });
    }
  } catch (err) {
    return json_({ status: 'error', message: err.message });
  }
}

// ============================================================
// GET — 投稿データ取得
// ============================================================
function handleGetPosts_(e) {
  const postsRows    = getSheet_(SHEET.POSTS).getDataRange().getValues();
  const likesRows    = getSheet_(SHEET.LIKES).getDataRange().getValues();
  const commentsRows = getSheet_(SHEET.COMMENTS).getDataRange().getValues();

  const likesMap = {};
  for (let i = 1; i < likesRows.length; i++) {
    const pid = likesRows[i][0];
    if (!likesMap[pid]) likesMap[pid] = [];
    likesMap[pid].push({
      user_id:   likesRows[i][1],
      user_name: likesRows[i][2]
    });
  }

  const commentsMap = {};
  for (let i = 1; i < commentsRows.length; i++) {
    if (commentsRows[i][6] === 'hidden') continue;
    const pid = commentsRows[i][1];
    if (!commentsMap[pid]) commentsMap[pid] = [];
    commentsMap[pid].push({
      id:        commentsRows[i][0],
      user_id:   commentsRows[i][2],
      user_name: commentsRows[i][3],
      text:      commentsRows[i][4],
      timestamp: commentsRows[i][5]
    });
  }

  const posts = [];
  for (let i = 1; i < postsRows.length; i++) {
    const r = postsRows[i];
    if (r[P.STATUS] === 'hidden') continue;

    const pid = r[P.ID];
    const likes    = likesMap[pid]    || [];
    const comments = commentsMap[pid] || [];

    posts.push({
      id:              pid,
      timestamp:       r[P.TIMESTAMP],
      lat:             r[P.LAT],
      lng:             r[P.LNG],
      category:        r[P.CATEGORY],
      tags:            r[P.TAGS] ? String(r[P.TAGS]).split(',').map(t => t.trim()) : [],
      title:           r[P.TITLE],
      description:     r[P.DESCRIPTION],
      photo_full_url:  r[P.PHOTO_FULL],
      photo_thumb_url: r[P.PHOTO_THUMB],
      user_id:         r[P.USER_ID],
      user_name:       r[P.USER_NAME],
      group:           r[P.GROUP],
      like_count:      likes.length,
      liked_by:        likes.map(l => l.user_name),
      liked_user_ids:  likes.map(l => l.user_id),
      comments:        comments,
      comment_count:   comments.length
    });
  }

  return json_({ status: 'ok', posts: posts, count: posts.length });
}

// ============================================================
// POST — 参加コード検証
// ============================================================
function handleVerifyCode_(data) {
  return json_({ status: 'ok', valid: isActiveCode_(data.code) });
}

// ============================================================
// POST — ユーザー名重複チェック
// ============================================================
function handleCheckUserName_(data) {
  return json_({ status: 'ok', available: isUserNameAvailable_(data.user_name) });
}

// ============================================================
// POST — ユーザー登録（新規ログイン）
// ============================================================
function handleRegisterUser_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (!isActiveCode_(data.code)) {
      return json_({ status: 'error', message: 'invalid_code' });
    }
    if (!isUserNameAvailable_(data.user_name)) {
      return json_({ status: 'error', message: 'username_taken' });
    }

    const userId = Utilities.getUuid();
    const now = nowISO_();

    getSheet_(SHEET.USERS).appendRow([
      userId,
      data.user_name,
      data.group || '',
      now,
      now
    ]);

    return json_({ status: 'ok', user_id: userId });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// POST — 再ログイン
// ============================================================
function handleRelogin_(data) {
  if (!isActiveCode_(data.code)) {
    return json_({ status: 'error', message: 'invalid_code' });
  }

  const sheet = getSheet_(SHEET.USERS);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.user_id) {
      sheet.getRange(i + 1, 5).setValue(nowISO_());
      return json_({
        status:    'ok',
        user_name: rows[i][1],
        group:     rows[i][2]
      });
    }
  }

  return json_({ status: 'error', message: 'user_not_found' });
}

// ============================================================
// POST — 気づき投稿
// ============================================================
function handleAddPost_(data) {
  if (!isActiveCode_(data.code)) {
    return json_({ status: 'error', message: 'invalid_code' });
  }

  const postId = Utilities.getUuid();
  const now    = nowISO_();

  let photoFullUrl  = '';
  let photoThumbUrl = '';
  if (data.photo_full) {
    const result  = uploadPhotos_(postId, data.photo_full, data.photo_thumb || '');
    photoFullUrl  = result.fullUrl;
    photoThumbUrl = result.thumbUrl;
  }

  const tags = Array.isArray(data.tags) ? data.tags.join(',') : (data.tags || '');

  getSheet_(SHEET.POSTS).appendRow([
    postId,
    now,
    data.lat,
    data.lng,
    data.category,
    tags,
    data.title,
    data.description || '',
    photoFullUrl,
    photoThumbUrl,
    data.user_id,
    data.user_name,
    data.group || '',
    data.code,
    'active'
  ]);

  return json_({
    status:          'ok',
    id:              postId,
    photo_full_url:  photoFullUrl,
    photo_thumb_url: photoThumbUrl
  });
}

// ============================================================
// POST — いいね（トグル）
// ============================================================
function handleToggleLike_(data) {
  if (!isActiveCode_(data.code)) {
    return json_({ status: 'error', message: 'invalid_code' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_(SHEET.LIKES);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.post_id && rows[i][1] === data.user_id) {
        sheet.deleteRow(i + 1);
        const count = countLikes_(sheet, data.post_id);
        return json_({ status: 'ok', liked: false, like_count: count });
      }
    }

    sheet.appendRow([
      data.post_id,
      data.user_id,
      data.user_name,
      nowISO_()
    ]);

    const count = countLikes_(sheet, data.post_id);
    return json_({ status: 'ok', liked: true, like_count: count });
  } finally {
    lock.releaseLock();
  }
}

function countLikes_(sheet, postId) {
  const rows = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === postId) count++;
  }
  return count;
}

// ============================================================
// POST — コメント投稿
// ============================================================
function handleAddComment_(data) {
  if (!isActiveCode_(data.code)) {
    return json_({ status: 'error', message: 'invalid_code' });
  }

  const commentId = Utilities.getUuid();
  const now       = nowISO_();

  getSheet_(SHEET.COMMENTS).appendRow([
    commentId,
    data.post_id,
    data.user_id,
    data.user_name,
    data.text,
    now,
    'active'
  ]);

  return json_({ status: 'ok', id: commentId, timestamp: now });
}

// ============================================================
// POST — 投稿を非表示（管理者用）
// ============================================================
function handleHidePost_(data) {
  const adminKey = getConfigValue_('admin_key');
  if (!adminKey || data.admin_key !== adminKey) {
    return json_({ status: 'error', message: 'unauthorized' });
  }

  const sheet = getSheet_(SHEET.POSTS);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][P.ID] === data.id) {
      sheet.getRange(i + 1, P.STATUS + 1).setValue('hidden');
      return json_({ status: 'ok' });
    }
  }
  return json_({ status: 'error', message: 'not_found' });
}

// ============================================================
// POST — コメントを非表示（管理者用）
// ============================================================
function handleHideComment_(data) {
  const adminKey = getConfigValue_('admin_key');
  if (!adminKey || data.admin_key !== adminKey) {
    return json_({ status: 'error', message: 'unauthorized' });
  }

  const sheet = getSheet_(SHEET.COMMENTS);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.getRange(i + 1, 7).setValue('hidden');
      return json_({ status: 'ok' });
    }
  }
  return json_({ status: 'error', message: 'not_found' });
}
