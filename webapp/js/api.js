/**
 * Apps Script API 通信モジュール
 */
const API = {
  async get(action, params = {}) {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { redirect: 'follow' });
    return res.json();
  },

  async post(data) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow'
    });
    return res.json();
  },

  /**
   * Google Drive 画像URLを直接埋め込み可能な形式に変換
   */
  fixDriveUrl(url) {
    if (!url) return '';
    const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1];
    if (url.includes('lh3.googleusercontent.com')) return url;
    return url;
  },

  // --- キャッシュ ---
  _CACHE_KEY: DISTRICT.id + '_posts_cache',
  _CACHE_TTL: 30 * 1000, // 30秒

  _saveCache(data) {
    try {
      localStorage.setItem(this._CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data: data
      }));
    } catch(e) { /* quota exceeded — ignore */ }
  },

  _loadCache() {
    try {
      const raw = localStorage.getItem(this._CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      return cache.data || null;
    } catch(e) { return null; }
  },

  _isCacheFresh() {
    try {
      const raw = localStorage.getItem(this._CACHE_KEY);
      if (!raw) return false;
      const cache = JSON.parse(raw);
      return (Date.now() - cache.ts) < this._CACHE_TTL;
    } catch(e) { return false; }
  },

  _fixUrls(posts) {
    posts.forEach(p => {
      p.photo_full_url  = this.fixDriveUrl(p.photo_full_url);
      p.photo_thumb_url = this.fixDriveUrl(p.photo_thumb_url);
    });
    return posts;
  },

  /**
   * 投稿データ取得（キャッシュ優先）
   */
  async getPosts(opts = {}) {
    const cached = this._loadCache();

    if (cached && this._isCacheFresh() && !opts.forceRefresh) {
      return { status: 'ok', posts: this._fixUrls(cached), count: cached.length, fromCache: true };
    }

    const fetchPromise = this.get('getPosts').then(res => {
      if (res.posts) {
        this._saveCache(res.posts);
        this._fixUrls(res.posts);
      }
      return res;
    }).catch(() => null);

    if (cached) {
      fetchPromise.then(res => {
        if (res && opts.onUpdate) opts.onUpdate(res);
      });
      return { status: 'ok', posts: this._fixUrls(cached), count: cached.length, fromCache: true };
    }

    const res = await fetchPromise;
    return res || { status: 'ok', posts: [], count: 0 };
  },
  verifyCode(code)        { return this.post({ action: 'verifyCode', code }); },
  checkUserName(user_name){ return this.post({ action: 'checkUserName', user_name }); },

  registerUser(user_name, group, code) {
    return this.post({ action: 'registerUser', user_name, group, code });
  },

  relogin(user_id, code) {
    return this.post({ action: 'relogin', user_id, code });
  },

  addPost(postData) {
    return this.post({ action: 'addPost', ...postData });
  },

  toggleLike(post_id, user_id, user_name, code) {
    return this.post({ action: 'toggleLike', post_id, user_id, user_name, code });
  },

  addComment(post_id, user_id, user_name, text, code) {
    return this.post({ action: 'addComment', post_id, user_id, user_name, text, code });
  }
};
