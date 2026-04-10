/**
 * セッション管理モジュール
 * localStorage キーは DISTRICT.id を接頭辞に使用
 */
const Auth = {
  // localStorage キー（DISTRICT.id で名前空間を分離）
  KEY_USER_ID:   DISTRICT.id + '_user_id',
  KEY_USER_NAME: DISTRICT.id + '_user_name',
  KEY_GROUP:     DISTRICT.id + '_group',
  KEY_CODE:      DISTRICT.id + '_code',
  KEY_LOGIN_AT:  DISTRICT.id + '_login_at',

  SESSION_TTL: 24 * 60 * 60 * 1000, // 24時間

  save(userId, userName, group, code) {
    localStorage.setItem(this.KEY_USER_ID,   userId);
    localStorage.setItem(this.KEY_USER_NAME, userName);
    localStorage.setItem(this.KEY_GROUP,     group || '');
    localStorage.setItem(this.KEY_CODE,      code);
    localStorage.setItem(this.KEY_LOGIN_AT,  Date.now().toString());
  },

  get() {
    return {
      userId:   localStorage.getItem(this.KEY_USER_ID),
      userName: localStorage.getItem(this.KEY_USER_NAME),
      group:    localStorage.getItem(this.KEY_GROUP),
      code:     localStorage.getItem(this.KEY_CODE),
      loginAt:  parseInt(localStorage.getItem(this.KEY_LOGIN_AT) || '0', 10)
    };
  },

  /** セッションが有効か（24時間以内） */
  isSessionActive() {
    const { userId, loginAt } = this.get();
    if (!userId || !loginAt) return false;
    return (Date.now() - loginAt) < this.SESSION_TTL;
  },

  /** user_id はあるがセッション切れ（再ログイン対象） */
  canRelogin() {
    const { userId, loginAt } = this.get();
    return !!userId && (Date.now() - loginAt) >= this.SESSION_TTL;
  },

  refreshSession() {
    localStorage.setItem(this.KEY_LOGIN_AT, Date.now().toString());
  },

  clearAll() {
    [this.KEY_USER_ID, this.KEY_USER_NAME, this.KEY_GROUP, this.KEY_CODE, this.KEY_LOGIN_AT]
      .forEach(k => localStorage.removeItem(k));
  },

  /** ログイン必須ページで呼ぶ。未認証ならログインページへリダイレクト */
  requireLogin() {
    if (!this.isSessionActive()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  /** ログアウト（セッションを無効化、user_id/user_nameは保持して再ログイン可能に） */
  logout() {
    localStorage.removeItem(this.KEY_CODE);
    localStorage.removeItem(this.KEY_LOGIN_AT);
    localStorage.removeItem(DISTRICT.id + '_posts_cache');
    window.location.href = '/';
  }
};
