/**
 * 老松町内会 — 設定ファイル（設定例）
 *
 * このファイルを webapp/js/config.js にコピーして使用してください。
 * GeoJSON ファイルも examples/oimatsu/geojson/ から webapp/geojson/ にコピーしてください。
 */

// ============================================================
//  地区情報
// ============================================================
const DISTRICT = {
    id: 'oimatsu',
    name: '老松町内会',
    subtitle: '防災ウェブマップ',
    contact: {
        label: '老松町内会',
        note:  '※ここはサンプルの連絡先です',
        phone: '000-000-0000',
    },
    dataSource: '独自作成（老松町.gpkg）',
    lastUpdated: '2026年4月6日',
};

// ============================================================
//  Google Apps Script API
// ============================================================
const API_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec';

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
const DEFAULT_POST_CENTER = [35.449201764345425, 139.62294559548633];
const DEFAULT_POST_ZOOM = 16;

const CONFIG = {
    map: {
        center: [35.449201764345425, 139.62294559548633],
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

    layers: [
        // --------------------------------------------------
        //  地区独自データ（老松町内会で作成）
        // --------------------------------------------------
        {
            id: "aed",
            name: "AED",
            type: "point",
            file: "geojson/aed.geojson",
            color: "#e53935",
            iconClass: "fa-heart-pulse",
            listLabel: "AED",
            visible: true
        },
        {
            id: "fire_equip",
            name: "消火栓",
            type: "point",
            file: "geojson/fire_equip.geojson",
            color: "#fb8c00",
            iconClass: "fa-fire-extinguisher",
            listLabel: "消火栓",
            visible: true
        },
        {
            id: "public_facilities",
            name: "公共施設 (自治会館等)",
            type: "point",
            file: "geojson/public_facilities.geojson",
            color: "#1e88e5",
            iconClass: "fa-building",
            listLabel: "公共施設",
            visible: true
        },
        {
            id: "rescue_zones",
            name: "救護区画",
            type: "polygon",
            file: "geojson/rescue_zones.geojson",
            color: "#2e7d32",
            fillOpacity: 0.3,
            fitBounds: true,
            visible: false
        },
        // --------------------------------------------------
        //  全国共通データ（国土数値情報 A33/A47）
        // --------------------------------------------------
        {
            id: "landslide",
            name: "土砂災害警戒区域",
            type: "polygon",
            file: "geojson/landslide.geojson",
            color: "#d32f2f",
            fillOpacity: 0.4,
            visible: false
        },
        {
            id: "steep_slope",
            name: "急傾斜崩壊危険区域",
            type: "polygon",
            file: "geojson/steep_slope.geojson",
            color: "#fbc02d",
            fillOpacity: 0.4,
            visible: false
        }
    ]
};
