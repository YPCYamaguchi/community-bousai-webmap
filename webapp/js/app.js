document.addEventListener("DOMContentLoaded", () => {
    const map = window.appMap = L.map("map", {
        center: CONFIG.map.center,
        zoom: CONFIG.map.zoom,
        minZoom: CONFIG.map.minZoom,
        maxZoom: CONFIG.map.maxZoom,
        zoomControl: false
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const basemapLayers = {};
    Object.entries(CONFIG.basemaps).forEach(([key, basemap]) => {
        basemapLayers[key] = L.tileLayer(basemap.url, {
            attribution: basemap.attribution,
            maxZoom: CONFIG.map.maxZoom
        });
    });
    basemapLayers.osm.addTo(map);

    document.querySelectorAll('input[name="basemap"]').forEach((radio) => {
        radio.addEventListener("change", (event) => {
            const selected = event.target.value;
            Object.values(basemapLayers).forEach((layer) => map.removeLayer(layer));
            if (basemapLayers[selected]) {
                basemapLayers[selected].addTo(map);
            }
        });
    });

    const mapLayers = {};
    const featureData = [];

    const createCustomIcon = (iconClass, color) => {
        const markerHtml = `<div style="background-color:${color};width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);opacity:0.7;font-size:0.6rem;"><i class="fa-solid ${iconClass}"></i></div>`;
        return L.divIcon({
            html: markerHtml,
            className: "custom-div-icon",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            popupAnchor: [0, -11]
        });
    };

    const RESCUE_ZONE_PALETTE = [
        "#2e7d32",
        "#1976d2",
        "#f57c00",
        "#7b1fa2",
        "#c62828",
        "#00897b",
        "#6d4c41",
        "#546e7a"
    ];
    const RESCUE_REFERENCE_LAT = CONFIG.map.center[0];

    const toProjectedPoint = (coordinate) => {
        const latRad = RESCUE_REFERENCE_LAT * Math.PI / 180;
        return {
            x: coordinate[0] * 111320 * Math.cos(latRad),
            y: coordinate[1] * 110540
        };
    };

    const getZonePolygons = (geometry) => {
        if (!geometry || !geometry.coordinates) return [];
        if (geometry.type === "Polygon") return [geometry.coordinates];
        if (geometry.type === "MultiPolygon") return geometry.coordinates;
        return [];
    };

    const getZoneMetrics = (feature) => {
        const polygons = getZonePolygons(feature.geometry);
        const projectedPolygons = polygons.map((polygon) =>
            polygon.map((ring) => ring.map((coord) => toProjectedPoint(coord)))
        );

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        projectedPolygons.forEach((polygon) => {
            polygon.forEach((ring) => {
                ring.forEach((point) => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
            });
        });

        return {
            polygons: projectedPolygons,
            bbox: { minX, minY, maxX, maxY }
        };
    };

    const subtractPoints = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
    const crossProduct = (a, b) => a.x * b.y - a.y * b.x;
    const dotProduct = (a, b) => a.x * b.x + a.y * b.y;

    const pointToSegmentDistance = (point, start, end) => {
        const segment = subtractPoints(end, start);
        const segmentLengthSq = dotProduct(segment, segment);
        if (segmentLengthSq === 0) {
            return Math.hypot(point.x - start.x, point.y - start.y);
        }

        const projected = dotProduct(subtractPoints(point, start), segment) / segmentLengthSq;
        const clamped = Math.max(0, Math.min(1, projected));
        const closest = {
            x: start.x + (segment.x * clamped),
            y: start.y + (segment.y * clamped)
        };

        return Math.hypot(point.x - closest.x, point.y - closest.y);
    };

    const orientation = (a, b, c) => crossProduct(subtractPoints(b, a), subtractPoints(c, a));

    const onSegment = (a, b, c) => (
        Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) &&
        Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y)
    );

    const segmentsIntersect = (p1, p2, q1, q2) => {
        const o1 = orientation(p1, p2, q1);
        const o2 = orientation(p1, p2, q2);
        const o3 = orientation(q1, q2, p1);
        const o4 = orientation(q1, q2, p2);
        const epsilon = 1e-9;

        if ((o1 > epsilon && o2 < -epsilon || o1 < -epsilon && o2 > epsilon) &&
            (o3 > epsilon && o4 < -epsilon || o3 < -epsilon && o4 > epsilon)) {
            return true;
        }

        if (Math.abs(o1) <= epsilon && onSegment(p1, q1, p2)) return true;
        if (Math.abs(o2) <= epsilon && onSegment(p1, q2, p2)) return true;
        if (Math.abs(o3) <= epsilon && onSegment(q1, p1, q2)) return true;
        if (Math.abs(o4) <= epsilon && onSegment(q1, p2, q2)) return true;
        return false;
    };

    const pointInRing = (point, ring) => {
        let inside = false;

        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i].x;
            const yi = ring[i].y;
            const xj = ring[j].x;
            const yj = ring[j].y;
            const intersects = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
            if (intersects) inside = !inside;
        }

        return inside;
    };

    const polygonContainsPoint = (polygon, point) => {
        if (!polygon.length || !pointInRing(point, polygon[0])) return false;
        for (let i = 1; i < polygon.length; i += 1) {
            if (pointInRing(point, polygon[i])) return false;
        }
        return true;
    };

    const polygonPairIntersects = (polygonA, polygonB) => {
        for (const ringA of polygonA) {
            for (let i = 0; i < ringA.length - 1; i += 1) {
                for (const ringB of polygonB) {
                    for (let j = 0; j < ringB.length - 1; j += 1) {
                        if (segmentsIntersect(ringA[i], ringA[i + 1], ringB[j], ringB[j + 1])) {
                            return true;
                        }
                    }
                }
            }
        }

        return polygonContainsPoint(polygonA, polygonB[0][0]) || polygonContainsPoint(polygonB, polygonA[0][0]);
    };

    const polygonPairMinDistance = (polygonA, polygonB) => {
        let minDistance = Infinity;

        for (const ringA of polygonA) {
            for (let i = 0; i < ringA.length - 1; i += 1) {
                for (const ringB of polygonB) {
                    for (let j = 0; j < ringB.length - 1; j += 1) {
                        minDistance = Math.min(
                            minDistance,
                            pointToSegmentDistance(ringA[i], ringB[j], ringB[j + 1]),
                            pointToSegmentDistance(ringA[i + 1], ringB[j], ringB[j + 1]),
                            pointToSegmentDistance(ringB[j], ringA[i], ringA[i + 1]),
                            pointToSegmentDistance(ringB[j + 1], ringA[i], ringA[i + 1])
                        );
                    }
                }
            }
        }

        return minDistance;
    };

    const bboxGap = (bboxA, bboxB) => ({
        xGap: Math.max(0, bboxA.minX - bboxB.maxX, bboxB.minX - bboxA.maxX),
        yGap: Math.max(0, bboxA.minY - bboxB.maxY, bboxB.minY - bboxA.maxY)
    });

    const buildRescueZoneColorLookup = (features) => {
        const groupsByName = new Map();

        features.forEach((feature, index) => {
            const name = (feature.properties?.name || "").trim();
            const key = name || `__feature_${feature.properties?.id ?? index}`;

            if (!groupsByName.has(key)) {
                groupsByName.set(key, {
                    key,
                    colorIndex: null,
                    featureEntries: [],
                    neighbors: new Set()
                });
            }

            groupsByName.get(key).featureEntries.push({
                featureId: feature.properties?.id ?? index,
                metrics: getZoneMetrics(feature)
            });
        });

        const groups = Array.from(groupsByName.values());
        const ROAD_FACING_DISTANCE_METERS = 20;

        const hasConflict = (groupA, groupB) => {
            for (const featureA of groupA.featureEntries) {
                for (const featureB of groupB.featureEntries) {
                    const gap = bboxGap(featureA.metrics.bbox, featureB.metrics.bbox);
                    if (gap.xGap > ROAD_FACING_DISTANCE_METERS && gap.yGap > ROAD_FACING_DISTANCE_METERS) {
                        continue;
                    }

                    for (const polygonA of featureA.metrics.polygons) {
                        for (const polygonB of featureB.metrics.polygons) {
                            if (polygonPairIntersects(polygonA, polygonB)) {
                                return true;
                            }

                            const minDistance = polygonPairMinDistance(polygonA, polygonB);
                            if (
                                minDistance <= ROAD_FACING_DISTANCE_METERS &&
                                (gap.xGap <= ROAD_FACING_DISTANCE_METERS || gap.yGap <= ROAD_FACING_DISTANCE_METERS)
                            ) {
                                return true;
                            }
                        }
                    }
                }
            }

            return false;
        };

        for (let i = 0; i < groups.length; i += 1) {
            for (let j = i + 1; j < groups.length; j += 1) {
                if (hasConflict(groups[i], groups[j])) {
                    groups[i].neighbors.add(groups[j].key);
                    groups[j].neighbors.add(groups[i].key);
                }
            }
        }

        groups
            .sort((a, b) => b.neighbors.size - a.neighbors.size)
            .forEach((group) => {
                const usedColors = new Set(
                    Array.from(group.neighbors)
                        .map((neighborKey) => groupsByName.get(neighborKey)?.colorIndex)
                        .filter((colorIndex) => colorIndex !== null && colorIndex !== undefined)
                );

                let nextColorIndex = 0;
                while (usedColors.has(nextColorIndex)) {
                    nextColorIndex += 1;
                }
                group.colorIndex = nextColorIndex;
            });

        const lookup = new Map();
        groups.forEach((group) => {
            const color = RESCUE_ZONE_PALETTE[group.colorIndex % RESCUE_ZONE_PALETTE.length];
            group.featureEntries.forEach(({ featureId }) => {
                lookup.set(featureId, color);
            });
        });

        return lookup;
    };

    const getFeatureDisplayName = (layerConfig, feature) => {
        const baseName = feature.properties?.name || "名称未設定";
        if (layerConfig.id === "aed") {
            return feature.properties?.id ? `AED No.${feature.properties.id}` : "AED";
        }
        if (layerConfig.id === "fire_equip") {
            return feature.properties?.id ? `消火栓 No.${feature.properties.id}` : "消火栓";
        }
        return baseName;
    };

    const ensureLayerVisible = (layerId) => {
        const layer = mapLayers[layerId];
        if (!layer || map.hasLayer(layer)) return;

        layer.addTo(map);
        const toggleItem = document.querySelector(`.toggle-item[data-layer-id="${layerId}"]`);
        if (toggleItem) {
            toggleItem.classList.add("active");
        }
    };

    const updateFacilityList = () => {
        document.querySelectorAll(".facility-ul").forEach((ul) => {
            ul.innerHTML = "";
        });

        featureData
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "ja"))
            .forEach((item) => {
                const list = document.getElementById(item.listTarget);
                if (!list) return;

                const listItem = document.createElement("li");
                listItem.textContent = item.name;
                listItem.addEventListener("click", () => {
                    ensureLayerVisible(item.layerId);
                    map.setView(item.latlng, 18);
                    setTimeout(() => item.leafletLayer.openPopup(), 200);
                    document.querySelector(".side-panel")?.classList.remove("open");
                    document.getElementById("side-panel-overlay")?.classList.remove("active");
                });
                list.appendChild(listItem);
            });
    };

    const loadLayers = async () => {
        const togglesContainer = document.getElementById("layer-toggles");

        for (const layerConfig of CONFIG.layers) {
            try {
                const response = await fetch(layerConfig.file);
                const data = await response.json();
                const rescueZoneColors = layerConfig.id === "rescue_zones"
                    ? buildRescueZoneColorLookup(data.features || [])
                    : null;

                const geoJsonLayer = L.geoJSON(data, {
                    pointToLayer: (feature, latlng) => {
                        if (layerConfig.type !== "point") {
                            return L.circleMarker(latlng);
                        }
                        return L.marker(latlng, {
                            icon: createCustomIcon(layerConfig.iconClass, layerConfig.color)
                        });
                    },
                    style: (feature) => {
                        if (layerConfig.type !== "polygon") return undefined;

                        let featureColor = layerConfig.color;
                        if (layerConfig.id === "rescue_zones") {
                            featureColor = rescueZoneColors?.get(feature.properties?.id) || featureColor;
                        }

                        return {
                            color: featureColor,
                            weight: 2,
                            fillColor: featureColor,
                            fillOpacity: layerConfig.fillOpacity
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        const name = getFeatureDisplayName(layerConfig, feature);
                        let popupContent = `<div style="font-size:1.1rem;font-weight:bold;margin-bottom:5px;">${name}</div>`;
                        if (layerConfig.id !== "aed" && layerConfig.id !== "fire_equip") {
                            popupContent += `<div>カテゴリ: ${layerConfig.name}</div>`;
                        }
                        layer.bindPopup(popupContent);

                        if (layerConfig.id === "rescue_zones" && feature.properties?.name) {
                            layer.bindTooltip(feature.properties.name, {
                                permanent: true,
                                direction: "center",
                                className: "rescue-zone-label"
                            });
                        }

                        if (layerConfig.listTarget) {
                            featureData.push({
                                name,
                                layerId: layerConfig.id,
                                listTarget: layerConfig.listTarget,
                                leafletLayer: layer,
                                latlng: layer.getLatLng ? layer.getLatLng() : layer.getBounds().getCenter()
                            });
                        }
                    }
                });

                mapLayers[layerConfig.id] = geoJsonLayer;

                if (layerConfig.visible) {
                    geoJsonLayer.addTo(map);
                }

                const toggleItem = document.createElement("div");
                toggleItem.className = `toggle-item ${layerConfig.visible ? "active" : ""}`;
                toggleItem.dataset.layerId = layerConfig.id;

                let iconHtml = "";
                if (layerConfig.type === "point") {
                    iconHtml = `<span class="icon-indicator" style="background-color:${layerConfig.color};color:#fff;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;font-size:10px;"><i class="fa-solid ${layerConfig.iconClass}"></i></span>`;
                } else {
                    iconHtml = `<span class="icon-indicator" style="background-color:${layerConfig.color};opacity:${layerConfig.fillOpacity || 1};border:1px solid ${layerConfig.color};"></span>`;
                }

                toggleItem.innerHTML = `
                    <div>
                        ${iconHtml}
                        <span style="font-weight:bold;">${layerConfig.name}</span>
                    </div>
                    <div class="switch"></div>
                `;

                toggleItem.addEventListener("click", () => {
                    const isActive = toggleItem.classList.contains("active");
                    if (isActive) {
                        toggleItem.classList.remove("active");
                        map.removeLayer(geoJsonLayer);
                    } else {
                        toggleItem.classList.add("active");
                        geoJsonLayer.addTo(map);
                    }
                });

                togglesContainer.appendChild(toggleItem);
            } catch (error) {
                console.error(`Error loading layer ${layerConfig.file}:`, error);
            }
        }

        updateFacilityList();

        if (mapLayers.rescue_zones) {
            map.fitBounds(mapLayers.rescue_zones.getBounds());
        }
    };

    const performSearch = () => {
        const query = document.getElementById("search-input").value.trim().toLowerCase();
        if (!query) return;

        const result = featureData.find((item) => item.name.toLowerCase().includes(query));
        if (!result) {
            alert("該当する施設が見つかりませんでした。");
            return;
        }

        ensureLayerVisible(result.layerId);
        map.setView(result.latlng, 18);
        setTimeout(() => result.leafletLayer.openPopup(), 200);
    };

    document.getElementById("search-btn").addEventListener("click", performSearch);
    document.getElementById("search-input").addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            performSearch();
        }
    });

    document.querySelectorAll(".tab-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
            document.querySelectorAll(".facility-ul").forEach((item) => item.classList.remove("active"));

            const targetId = event.currentTarget.getAttribute("data-target");
            event.currentTarget.classList.add("active");
            document.getElementById(targetId)?.classList.add("active");
        });
    });

    document.getElementById("btn-info")?.addEventListener("click", () => {
        document.getElementById("outline-section")?.classList.remove("hidden");
    });

    document.getElementById("close-outline")?.addEventListener("click", () => {
        document.getElementById("outline-section")?.classList.add("hidden");
    });

    // サイドパネル開閉
    const sidePanel = document.querySelector(".side-panel");
    const overlay = document.getElementById("side-panel-overlay");

    const closeSidePanel = () => {
        sidePanel?.classList.remove("open");
        overlay?.classList.remove("active");
    };

    const openSidePanel = () => {
        sidePanel?.classList.add("open");
        overlay?.classList.add("active");
    };

    document.getElementById("menu-toggle-btn")?.addEventListener("click", () => {
        if (sidePanel?.classList.contains("open")) {
            closeSidePanel();
        } else {
            openSidePanel();
        }
    });

    overlay?.addEventListener("click", closeSidePanel);

    // 現在位置表示
    let locationMarker = null;
    let locationCircle = null;

    document.getElementById("locate-btn")?.addEventListener("click", () => {
        const btn = document.getElementById("locate-btn");
        if (!navigator.geolocation) {
            alert("お使いのブラウザでは位置情報を取得できません。");
            return;
        }

        btn.classList.add("locating");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                btn.classList.remove("locating");
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                if (locationMarker) {
                    map.removeLayer(locationMarker);
                    map.removeLayer(locationCircle);
                }

                locationMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: "#4285f4",
                    fillOpacity: 1,
                    color: "#fff",
                    weight: 3
                }).addTo(map).bindPopup("現在位置");

                locationCircle = L.circle([lat, lng], {
                    radius: accuracy,
                    fillColor: "#4285f4",
                    fillOpacity: 0.15,
                    color: "#4285f4",
                    weight: 1
                }).addTo(map);

                map.setView([lat, lng], 17);
            },
            (error) => {
                btn.classList.remove("locating");
                let msg = "位置情報を取得できませんでした。";
                if (error.code === 1) msg = "位置情報の利用が許可されていません。";
                else if (error.code === 2) msg = "位置情報を取得できませんでした。";
                else if (error.code === 3) msg = "位置情報の取得がタイムアウトしました。";
                alert(msg);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    loadLayers();
});
