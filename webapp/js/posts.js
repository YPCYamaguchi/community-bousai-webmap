/**
 * 投稿マーカー表示・ポーリング（index.html 用）
 * app.js の後に読み込む。グローバル変数 map を使用。
 */
(function() {
    let postsData = [];
    let categoryLayers = {};

    // app.js のマップ初期化完了を待つ
    function waitForMap(cb) {
        const check = () => {
            if (window.appMap) { cb(); }
            else { setTimeout(check, 100); }
        };
        check();
    }

    waitForMap(async () => {
        // 未ログイン → ログインボタンを表示して終了
        if (!Auth.isSessionActive()) {
            const loginFab = document.getElementById('login-fab');
            if (loginFab) loginFab.style.display = 'flex';
            return;
        }

        // ナビゲーションバー・プロフィールボタンを表示
        const nav = document.getElementById('bottom-nav');
        if (nav) nav.style.display = 'flex';
        const profileBtn = document.getElementById('btn-profile');
        if (profileBtn) profileBtn.style.display = 'flex';

        // マップのコントロール位置を調整（ナビバー分の余白）
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.style.paddingBottom = '60px';

        // トースト通知
        const toastMsg = sessionStorage.getItem('toast');
        if (toastMsg) {
            sessionStorage.removeItem('toast');
            showToast(toastMsg);
        }

        // --- 投稿レイヤー切替UI ---
        const postToggleSection = document.getElementById('post-layer-toggles');
        const postTogglesContainer = document.getElementById('post-toggles');
        if (postToggleSection) postToggleSection.style.display = '';

        // カテゴリ別のLayerGroupを作成
        Object.entries(CATEGORIES).forEach(([key, cat]) => {
            categoryLayers[key] = { group: L.layerGroup(), visible: true };

            const item = document.createElement('div');
            item.className = 'toggle-item active';
            item.dataset.cat = key;
            item.innerHTML = `
                <div>
                    <span class="icon-indicator" style="background-color:${cat.color};color:#fff;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;font-size:10px;">
                        <i class="fa-solid ${cat.icon}"></i>
                    </span>
                    <span style="font-weight:bold;">${cat.name}</span>
                </div>
                <div class="switch"></div>
            `;
            item.addEventListener('click', () => {
                const cl = categoryLayers[key];
                cl.visible = !cl.visible;
                item.classList.toggle('active', cl.visible);
                if (cl.visible) {
                    cl.group.addTo(window.appMap);
                } else {
                    window.appMap.removeLayer(cl.group);
                }
            });
            postTogglesContainer.appendChild(item);
        });

        // URLパラメータで特定の投稿にジャンプ
        const params = new URLSearchParams(location.search);
        const jumpLat = parseFloat(params.get('lat'));
        const jumpLng = parseFloat(params.get('lng'));
        const jumpPostId = params.get('post');

        // 投稿データを取得してマーカー表示
        await loadPosts();

        if (jumpLat && jumpLng && window.appMap) {
            window.appMap.setView([jumpLat, jumpLng], 18);
        }

        // 60秒ポーリング（±10秒ランダム）
        setInterval(() => {
            loadPosts();
        }, 60000 + (Math.random() - 0.5) * 20000);

        // visibilitychange でデータリフレッシュ
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (Auth.isSessionActive()) {
                    loadPosts();
                }
            }
        });
    });

    async function loadPosts(force) {
        try {
            const res = await API.getPosts({
                forceRefresh: force,
                onUpdate: (freshRes) => {
                    postsData = freshRes.posts || [];
                    renderMarkers();
                }
            });
            postsData = res.posts || [];
            renderMarkers();
        } catch (e) {
            // ネットワークエラー時はスキップ
        }
    }

    function renderMarkers() {
        if (!window.appMap || !Object.keys(categoryLayers).length) return;

        // カテゴリ別 LayerGroup をクリア
        Object.values(categoryLayers).forEach(cl => cl.group.clearLayers());

        postsData.forEach(post => {
            if (!post.lat || !post.lng) return;
            const catKey = post.category || 'other';
            const cat = CATEGORIES[catKey] || CATEGORIES.other;

            const markerHtml = `<div style="
                background:${cat.color};
                width:34px;height:34px;border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                color:#fff;border:2.5px solid #fff;
                box-shadow:0 2px 8px rgba(0,0,0,0.4);
                font-size:0.85rem;
            "><i class="fa-solid ${cat.icon}"></i></div>`;

            const icon = L.divIcon({
                html: markerHtml,
                className: 'custom-div-icon post-marker',
                iconSize: [34, 34],
                iconAnchor: [17, 17],
                popupAnchor: [0, -20]
            });

            const marker = L.marker([post.lat, post.lng], { icon });

            const thumbImg = post.photo_thumb_url
                ? `<img src="${post.photo_thumb_url}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px;" loading="lazy">`
                : '';

            marker.bindPopup(`
                ${thumbImg}
                <b>${escHtml(post.title)}</b><br>
                <span style="font-size:0.8rem;color:#666;">
                    ${escHtml(post.user_name)} ・ ❤${post.like_count || 0} 💬${post.comment_count || 0}
                </span><br>
                <a href="detail?id=${post.id}" style="font-size:0.85rem;">詳細を見る →</a>
            `, { maxWidth: 220 });

            // カテゴリ別 LayerGroup に追加
            const cl = categoryLayers[catKey] || categoryLayers['other'];
            if (cl) cl.group.addLayer(marker);
        });

        // 各カテゴリの LayerGroup をマップに追加（visible なもののみ）
        Object.values(categoryLayers).forEach(cl => {
            if (cl.visible && !cl.group._map) {
                cl.group.addTo(window.appMap);
            }
        });
    }

    function escHtml(s) {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    function showToast(msg) {
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2500);
    }
})();
