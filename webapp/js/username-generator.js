/**
 * 「色 + 動物・植物」ランダムユーザー名生成
 */
const UserNameGenerator = {
  colors: [
    '赤い','青い','緑の','黄色い','紫の','白い','橙の','桃色の','水色の','金色の'
  ],
  nouns: [
    'カピバラ','タヌキ','ウサギ','フクロウ','カワウソ','ペンギン','リス','コアラ',
    'パンダ','キツネ','サクラ','ヒマワリ','タンポポ','ツバキ','アジサイ',
    'モミジ','ハス','スミレ','コスモス','クローバー'
  ],

  /** ランダムに1件生成 */
  generate() {
    const c = this.colors[Math.floor(Math.random() * this.colors.length)];
    const n = this.nouns[Math.floor(Math.random() * this.nouns.length)];
    return c + n;
  },

  /**
   * APIで重複チェックしつつ生成（最大5回→数字付与）
   * @returns {Promise<string>} 利用可能なユーザー名
   */
  async generateUnique() {
    for (let i = 0; i < 5; i++) {
      const name = this.generate();
      const res = await API.checkUserName(name);
      if (res.available) return name;
    }
    // 5回失敗 → 末尾に数字を付与
    const base = this.generate();
    for (let n = 2; n <= 99; n++) {
      const name = base + n;
      const res = await API.checkUserName(name);
      if (res.available) return name;
    }
    return base + Date.now(); // 最終手段
  }
};
