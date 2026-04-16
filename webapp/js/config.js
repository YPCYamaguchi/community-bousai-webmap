/**
 * 防災ウェブマップ — 設定ファイル
 *
 * 新しい地区に対応する場合は、このファイルの値を編集してください。
 * 他の JS / HTML ファイルを変更する必要はありません。
 */

// ============================================================
//  地区情報（DISTRICT）
// ============================================================
const DISTRICT = {
    /** localStorage キーの接頭辞（英数字、地区ごとに一意にする） */
    id: 'example',

    /** ヘッダーやタイトルに表示する地区名 */
    name: '○○自治会',

    /** サブタイトル */
    subtitle: '防災ウェブマップ',

    /** 情報モーダルに表示する連絡先 */
    contact: {
        label: '○○自治会 防災部',
        note:  '※ここにサンプルの連絡先を記載',
        phone: '000-000-0000',
    },

    /** データ出典（情報モーダル用） */
    dataSource: '',

    /** 最終更新日 */
    lastUpdated: '',
};

// ============================================================
//  Google Apps Script API
// ============================================================
const API_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

// ============================================================
//  投稿カテゴリ・タグ・グループ
// ============================================================
const CATEGORIES = {
    danger: { name: '危険', icon: 'fa-triangle-exclamation', color: '#e53935' },
    useful: { name: '役立つ', icon: 'fa-thumbs-up', color: '#43a047' },
    other: { name: 'その他', icon: 'fa-comment-dots', color: '#1e88e5' }
};

const TAGS = [
    'ブロック塀', '電柱', '建物密集', '通り抜け', '狭い道', '坂', '階段',
    '老朽化', '空き家', '行き止まり', '避難場所', 'AED', '消火栓', '消火器', '消火設備', 'その他'
];

const GROUPS = ['A', 'B', 'C', 'D', 'その他'];

// ============================================================
//  地図設定
// ============================================================

/** 投稿ページ: GPS取得失敗時のデフォルト位置 */
const DEFAULT_POST_CENTER = [35.45, 139.62];
const DEFAULT_POST_ZOOM = 16;

const CONFIG = {
    map: {
        center: [35.45, 139.62],   // [緯度, 経度] 地区の中心座標
        zoom: 15,
        minZoom: 10,
        maxZoom: 19
    },

    basemaps: {
        osm_pale: {
            name: "淡色OSM地図",
            url: "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        },
        osm: {
            name: "標準地図",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        },
        pale: {
            name: "地理院 淡色地図",
            url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
        },
        photo: {
            name: "航空写真",
            url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
        }
    },

    // ============================================================
    //  GeoJSON レイヤー定義
    //
    //  【地区独自データ】 地区ごとに作成が必要
    //    - AED、消火栓、公共施設、救護区画 など
    //    - 自治会での調査・まち歩きで収集したデータ
    //
    //  【全国共通データ（国土数値情報）】 どの地区でも取得可能
    //    - 土砂災害警戒区域（A33）: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A33-2024.html
    //    - 急傾斜崩壊危険区域（A47）: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A47-2021.html
    //    - 洪水浸水想定区域（A31）等も追加可能
    //    ※ ダウンロード後、対象地区の範囲でクリップし GeoJSON に変換
    //    ※ 詳細は docs/CUSTOMIZATION.md 参照
    // ============================================================
    // ============================================================
    //  GeoJSON レイヤー定義 — プロパティ一覧
    //
    //  id          : (必須) レイヤーの一意な識別子
    //  name        : (必須) サイドパネルのトグルに表示する名前
    //  type        : (必須) "point" | "polygon"
    //  file        : (必須) GeoJSON ファイルパス
    //  color       : (必須) マーカー / ポリゴンの色
    //  iconClass   : (point のみ) Font Awesome アイコンクラス
    //  fillOpacity : (polygon のみ) 塗りの不透明度
    //  visible     : 初期表示状態（省略時 false）
    //  listLabel   : 施設一覧タブに表示する場合のタブ名
    //                省略 → 施設一覧に出さない
    //                同じ listLabel を複数レイヤーに指定 → 1つのタブに統合
    //  requireLogin: true にするとログイン時のみ表示（省略時 false）
    // ============================================================
    layers: [
        // --------------------------------------------------
        //  地区独自データ（各自治会で作成）
        // --------------------------------------------------
        // {
        //     id: "aed",
        //     name: "AED",
        //     type: "point",
        //     file: "geojson/aed.geojson",
        //     color: "#e53935",
        //     iconClass: "fa-heart-pulse",
        //     listLabel: "AED",
        //     visible: true
        // },
        // {
        //     id: "fire_equip",
        //     name: "消火栓",
        //     type: "point",
        //     file: "geojson/fire_equip.geojson",
        //     color: "#fb8c00",
        //     iconClass: "fa-fire-extinguisher",
        //     listLabel: "消火栓",
        //     visible: true
        // },
        // {
        //     id: "public_facilities",
        //     name: "公共施設 (自治会館等)",
        //     type: "point",
        //     file: "geojson/public_facilities.geojson",
        //     color: "#1e88e5",
        //     iconClass: "fa-building",
        //     listLabel: "公共施設",
        //     visible: true
        // },
        // {
        //     id: "rescue_zones",
        //     name: "救護区画",
        //     type: "polygon",
        //     file: "geojson/rescue_zones.geojson",
        //     color: "#2e7d32",
        //     fillOpacity: 0.3,
        //     visible: false
        // },

        // --------------------------------------------------
        //  全国共通データ（国土数値情報からダウンロード可能）
        //  ※ 対象地区の範囲でクリップして geojson/ に配置
        // --------------------------------------------------
        // {
        //     id: "landslide",
        //     name: "土砂災害警戒区域",
        //     type: "polygon",
        //     file: "geojson/landslide.geojson",
        //     color: "#d32f2f",
        //     fillOpacity: 0.4,
        //     visible: false
        // },
        // {
        //     id: "steep_slope",
        //     name: "急傾斜崩壊危険区域",
        //     type: "polygon",
        //     file: "geojson/steep_slope.geojson",
        //     color: "#fbc02d",
        //     fillOpacity: 0.4,
        //     visible: false
        // }
    ]
};
