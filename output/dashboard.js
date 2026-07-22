// =========================================
// AETHER NEWS OS
// Dashboard Intelligence Loader v7
// Scoped for embedding inside any page section.
// Every section loads independently — a failure in
// one panel can no longer blank out the others.
// =========================================

const SECTOR_ICONS = {
    "Cyber Security": "🛡",
    "War & Defence": "⚔",
    "Artificial Intelligence": "🤖",
    "AI": "🤖",
    "Economy": "💹",
    "Healthcare": "🏥",
    "Politics": "🏛",
    "Technology": "💻",
    "Supply Chain": "🚚",
    "Energy": "⚡"
};

const DEFAULT_ICON = "📡";

// Brand palette (cyan / violet / gold / green / amber / red / sky / pink)
const PALETTE = ["#00C8DC", "#8B5CF6", "#C8A96E", "#22c55e", "#f59e0b", "#e8334a", "#38bdf8", "#f472b6"];

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function getSectorColor(name) {
    return PALETTE[hashString(String(name)) % PALETTE.length];
}

function getSectorIcon(name) {
    return SECTOR_ICONS[name] || DEFAULT_ICON;
}

function getIntelligenceLevel(percent) {
    if (percent >= 75) return { label: "CRITICAL", className: "level-critical" };
    if (percent >= 50) return { label: "HIGH", className: "level-high" };
    if (percent >= 25) return { label: "MODERATE", className: "level-moderate" };
    return { label: "LOW", className: "level-low" };
}

function formatUpdatedTimestamp(date) {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} \u00b7 ${hours}:${minutes} UTC`;
}

// Every DOM lookup is scoped to the .aether-dash root so this script
// never touches ids/elements belonging to the host page.
function getDashRoot() {
    return document.querySelector(".aether-dash");
}

function q(root, name) {
    return root.querySelector(`[data-aether="${name}"]`);
}

// Runs a section builder in isolation — if it throws, that one panel
// shows an error state but every other panel keeps working.
function runSection(label, fn) {
    try {
        fn();
    } catch (error) {
        console.error(`AETHER dashboard: "${label}" section failed —`, error);
    }
}


// =========================================
// SECTOR INTELLIGENCE INDEX (bar list)
// =========================================

function buildSectorIntelligenceIndex(root, data) {

    const index = q(root, "sector-index");

    if (!index) {
        return null;
    }

    const articles = Array.isArray(data.top_articles) ? data.top_articles : [];

    if (articles.length === 0) {
        index.innerHTML = "<p class=\"aether-empty-note\">No sector data available yet.</p>";
        return null;
    }

    const sectors = {};

    articles.forEach(article => {

        if (!article) return;

        const sector = article.category || "Other";

        if (!sectors[sector]) {
            sectors[sector] = 0;
        }

        sectors[sector] += Number(article.score) || 0;

    });

    const entries = Object.entries(sectors)
        .sort((a, b) => b[1] - a[1]);

    index.innerHTML = "";

    if (entries.length === 0) {
        index.innerHTML = "<p class=\"aether-empty-note\">No sector data available yet.</p>";
        return null;
    }

    const totalIntelligence = entries.reduce((sum, [, score]) => sum + score, 0);
    const highestScore = entries[0][1];

    entries.forEach(([name, score], rowIndex) => {

        const percentOfMax = highestScore > 0
            ? Math.round((score / highestScore) * 100)
            : 0;

        const percentOfTotal = totalIntelligence > 0
            ? Math.round((score / totalIntelligence) * 100)
            : 0;

        const level = getIntelligenceLevel(percentOfMax);
        const icon = getSectorIcon(name);
        const color = getSectorColor(name);

        const row = document.createElement("div");

        row.className = "aether-sector-row aether-animate";
        row.style.animationDelay = `${rowIndex * 0.06}s`;

        row.innerHTML = `
            <div class="aether-sector-row-top">
                <div class="aether-sector-identity">
                    <span class="aether-sector-icon" style="background:${color}22;color:${color};">${icon}</span>
                    <span class="aether-sector-name">${name}</span>
                </div>
                <div class="aether-sector-meta">
                    <span class="aether-sector-score">${score}</span>
                    <span class="aether-sector-level ${level.className}">${level.label}</span>
                </div>
            </div>
            <div class="aether-bar-track">
                <div class="aether-bar-fill" data-target-width="${percentOfMax}" style="background:${color};"></div>
            </div>
            <div class="aether-sector-percent">${percentOfTotal}% of total intelligence</div>
        `;

        index.appendChild(row);

    });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            index.querySelectorAll(".aether-bar-fill").forEach(bar => {
                bar.style.width = `${bar.getAttribute("data-target-width")}%`;
            });
        });
    });

    return { entries, totalIntelligence, highestScore };

}


// =========================================
// SECTOR DISTRIBUTION (donut chart)
// =========================================

function buildSectorDonut(root, sectorResult) {

    const donut = q(root, "sector-donut");
    const legend = q(root, "sector-donut-legend");

    if (!donut || !legend) {
        return;
    }

    const entries = sectorResult ? sectorResult.entries : [];
    const totalIntelligence = sectorResult ? sectorResult.totalIntelligence : 0;

    if (!entries || entries.length === 0) {
        donut.style.background = "#1b2744";
        legend.innerHTML = "<p class=\"aether-empty-note\">No sector data available yet.</p>";
        return;
    }

    let cursor = 0;
    const stops = [];
    let legendHTML = "";

    entries.forEach(([name, score]) => {

        const percent = totalIntelligence > 0 ? (score / totalIntelligence) * 100 : 0;
        const color = getSectorColor(name);
        const start = cursor;
        const end = cursor + percent;

        stops.push(`${color} ${start}% ${end}%`);
        cursor = end;

        legendHTML += `
            <div class="aether-legend-item">
                <span class="aether-legend-dot" style="background:${color};"></span>
                <span class="aether-legend-name">${name}</span>
                <span class="aether-legend-value">${Math.round(percent)}%</span>
            </div>
        `;

    });

    donut.style.background = `conic-gradient(${stops.join(", ")})`;
    legend.innerHTML = legendHTML;

}


// =========================================
// EXECUTIVE SUMMARY STRIP
// =========================================

function updateIntelSummary(root, sectorResult) {

    const pressureEl = q(root, "summary-pressure");
    const dominantEl = q(root, "summary-dominant");
    const coverageEl = q(root, "summary-coverage");
    const averageEl = q(root, "summary-average");

    if (!pressureEl) {
        return;
    }

    const entries = sectorResult ? sectorResult.entries : [];
    const totalIntelligence = sectorResult ? sectorResult.totalIntelligence : 0;
    const highestScore = sectorResult ? sectorResult.highestScore : 0;

    if (!entries || entries.length === 0) {
        pressureEl.textContent = "-";
        dominantEl.textContent = "-";
        coverageEl.textContent = "0 sectors";
        averageEl.textContent = "-";
        return;
    }

    const average = Math.round(totalIntelligence / entries.length);
    const overallPercent = Math.min(100, Math.round((highestScore / (totalIntelligence || 1)) * 100));

    const pressure = getIntelligenceLevel(
        overallPercent >= 40 ? 80 : overallPercent >= 25 ? 55 : overallPercent >= 15 ? 30 : 10
    );

    pressureEl.textContent = pressure.label;
    pressureEl.className = `aether-summary-value ${pressure.className}`;

    dominantEl.textContent = entries[0][0];
    coverageEl.textContent = `${entries.length} sectors`;
    averageEl.textContent = average;

}
// =========================================
// GLOBAL RISK MAP (3D Globe + Bar Graph Side Panel + Legend)
// =========================================

function buildGlobalRiskMap(root, data) {

    const container = q(root, "global-risk");

    if (!container) {
        return;
    }

    container.style.display = "block";
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.height = "auto";
    container.style.marginTop = "0px";
    container.style.padding = "0";

    const hasLiveData = data && Array.isArray(data.global_risk) && data.global_risk.length > 0;
    const regions = hasLiveData ? data.global_risk : [
        { flag: "🇨🇳", name: "China", percent: 91, level: "CRITICAL" },
        { flag: "🌍", name: "Middle East", percent: 88, level: "CRITICAL" },
        { flag: "🇬🇧", name: "UK", percent: 82, level: "HIGH" },
        { flag: "🇷🇺", name: "Russia", percent: 79, level: "HIGH" },
        { flag: "🇺🇸", name: "USA", percent: 75, level: "HIGH" },
        { flag: "🇪🇺", name: "Europe", percent: 58, level: "MODERATE" }
    ];

    const aetherRiskColors = {
        UK: '#38bdf8',         
        Europe: '#C8A96E',     
        USA: '#22c55e',        
        China: '#f472b6',      
        "Middle East": '#00C8DC', 
        MiddleEast: '#00C8DC',
        Russia: '#22c55e',     
        Default: 'rgba(0, 0, 0, 0)' 
    };

    // 1. Build Legend HTML
    let legendHTML = '';
    regions.forEach(region => {
        const color = aetherRiskColors[region.name] || aetherRiskColors[region.name.replace(/\s+/g, '')] || '#38bdf8';
        legendHTML += `
            <span class="legend-item" style="display: inline-flex; align-items: center; gap: 8px;">
                <span class="dot" style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; display: inline-block;"></span> 
                ${region.flag ? region.flag + ' ' : ''}${region.name}: <strong style="font-family: 'Fira Code', monospace; color: var(--a-gold, #C8A96E);">${region.percent}%</strong>
            </span>
        `;
    });

    // 2. Build Side Bar Graph HTML
    let barsHTML = '';
    regions.forEach(region => {
        const color = aetherRiskColors[region.name] || aetherRiskColors[region.name.replace(/\s+/g, '')] || '#38bdf8';
        barsHTML += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 4px;">
                    <span style="font-weight: 600; color: var(--a-text, #eef3fa);">${region.flag || ''} ${region.name}</span>
                    <span style="font-family: 'Fira Code', monospace; color: var(--a-gold, #C8A96E);">${region.percent}%</span>
                </div>
                <div style="height: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${region.percent}%; background: ${color}; border-radius: 4px; transition: width 0.8s ease;"></div>
                </div>
            </div>
        `;
    });

    // Inject layout combining the top legend, side-by-side bar graph + globe, and info box
    container.innerHTML = `
        <div class="aether-risk-legend" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 20px 28px; padding: 14px 0 20px 0; font-size: 16px; font-weight: 700; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 16px;">
            ${legendHTML}
        </div>

        <div class="aether-risk-workspace" style="display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: stretch; margin-bottom: 16px;">
            <div class="aether-risk-bargraph-panel" style="background: rgba(15, 28, 46, 0.5); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--a-text, #eef3fa); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px;">📈 Threat Exposure Index</div>
                    ${barsHTML}
                </div>
                <div style="font-size: 10px; color: var(--a-text-dim, #93a4bd); font-style: italic; margin-top: 10px; text-align: center;">Comparative telemetry vector analysis</div>
            </div>

            <div id="aetherRiskGlobe" style="width: 100%; height: 480px; position: relative; overflow: hidden; border-radius: 12px;"></div>
        </div>
        
        <div class="aether-risk-info-box" style="background: rgba(15, 28, 46, 0.6); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 16px 20px; font-size: 13px; color: var(--a-text-dim, #93a4bd); line-height: 1.6;">
            <p style="margin-bottom: 8px; color: var(--a-text, #eef3fa); font-weight: 600;">📊 Telemetry & Heatmap Architecture Overview</p>
            <p style="margin-bottom: 8px;"><strong>Figure Status:</strong> The percentages shown above are dynamic telemetry models configured within the AETHER framework to drive visual exposure metrics across monitored zones. They function as structured input arrays mapping operational pressure rather than external raw feeds.</p>
            <p style="margin-bottom: 0;"><strong>Heatmap Mechanism:</strong> The system normalizes regional scores into tier thresholds, matching administrative GeoJSON boundaries to volumetric color fills and altitude elevations. This provides instant visual triage of global volatility hotspots while automatically anchoring baseline focus to domestic sector exposure.</p>
        </div>
    `;

    setTimeout(() => {
        const globeElement = container.querySelector("#aetherRiskGlobe");
        
        if (!globeElement) return;

        const getAetherCountryColor = (d) => {
            const countryName = d.properties.ADMIN;

            if (['United Kingdom'].includes(countryName)) return aetherRiskColors.UK;
            if (['United States of America'].includes(countryName)) return aetherRiskColors.USA;
            if (['China'].includes(countryName)) return aetherRiskColors.China;
            if (['Russia'].includes(countryName)) return aetherRiskColors.Russia;
            
            if (['Saudi Arabia', 'Iran', 'Iraq', 'Syria', 'Yemen', 'Oman', 'United Arab Emirates', 'Israel', 'Jordan', 'Qatar', 'Kuwait'].includes(countryName)) {
                return aetherRiskColors.MiddleEast;
            }
            
            if (['France', 'Germany', 'Spain', 'Italy', 'Poland', 'Ukraine', 'Sweden', 'Norway', 'Finland', 'Netherlands', 'Belgium', 'Austria', 'Switzerland'].includes(countryName)) {
                return aetherRiskColors.Europe;
            }

            return aetherRiskColors.Default;
        };

        const renderWidth = globeElement.clientWidth > 0 ? globeElement.clientWidth : (container.clientWidth > 0 ? container.clientWidth : 600);

        try {
            const aetherGlobe = Globe()(globeElement)
                .width(renderWidth)
                .height(480)
                .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                .backgroundColor('rgba(0,0,0,0)') 
                .showAtmosphere(true)
                .atmosphereColor('#38bdf8') 
                .atmosphereAltitude(0.15)
                .polygonCapColor(getAetherCountryColor)
                .polygonSideColor(d => getAetherCountryColor(d) === aetherRiskColors.Default ? 'rgba(0,0,0,0)' : 'rgba(0, 0, 0, 0.4)')
                .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.2)')
                .polygonAltitude(d => getAetherCountryColor(d) === aetherRiskColors.Default ? 0.001 : 0.015)
                .onPolygonHover(hoverD => aetherGlobe
                  .polygonAltitude(d => {
                      if (d === hoverD) return 0.06;
                      return getAetherCountryColor(d) === aetherRiskColors.Default ? 0.001 : 0.015;
                  })
                  .polygonCapColor(d => d === hoverD ? '#ffffff' : getAetherCountryColor(d))
                );

            aetherGlobe.pointOfView({ lat: 55.3781, lng: -3.4360, altitude: 1.8 }, 0);
            aetherGlobe.controls().autoRotate = true;
            aetherGlobe.controls().autoRotateSpeed = 1.5; 
            aetherGlobe.controls().enableZoom = true; 

            fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
                .then(res => res.json())
                .then(countries => {
                    aetherGlobe.polygonsData(countries.features);
                })
                .catch(err => console.error('AETHER Geo-Data Fetch Error:', err));

        } catch (initError) {
            console.error('AETHER Globe Initialization Failed:', initError);
        }

    }, 150);
}
// INTELLIGENCE REPORT CARDS
// =========================================

function buildArticles(root, data) {

    const container = q(root, "articles");

    if (!container) {
        return;
    }

    const articles = Array.isArray(data.top_articles) ? data.top_articles : [];

    container.innerHTML = "";

    if (articles.length === 0) {
        container.innerHTML = "<p class=\"aether-empty-note\">No intelligence reports available.</p>";
        return;
    }

    articles.forEach((article, index) => {

        // Skip individual malformed entries instead of failing the whole list
        try {

            if (!article) return;

            const card = document.createElement("div");

            card.className = "aether-report-card aether-animate";
            card.style.animationDelay = `${index * 0.08}s`;

            card.innerHTML = `
                <div class="aether-report-top">
                    <span class="aether-report-rank">#${article.rank ?? index + 1}</span>
                    <h3 class="aether-report-title">${article.title || "Untitled report"}</h3>
                </div>

                <div class="aether-report-tags">
                    <span class="aether-tag">${article.source || "Unknown source"}</span>
                    <span class="aether-tag">${article.category || "Other"}</span>
                    <span class="aether-tag aether-tag-alert">${article.threat_level || "-"}</span>
                </div>

                <div class="aether-report-stats">
                    <div>
                        <span class="aether-report-stat-label">Score</span>
                        <span class="aether-report-stat-value">${article.score ?? "-"}</span>
                    </div>
                    <div>
                        <span class="aether-report-stat-label">SME Risk</span>
                        <span class="aether-report-stat-value">${article.sme_risk || 0}%</span>
                    </div>
                    <div>
                        <span class="aether-report-stat-label">Confidence</span>
                        <span class="aether-report-stat-value">${article.confidence || 0}%</span>
                    </div>
                </div>

                <h4>Risk Domains</h4>
                <p>${(article.risk_domains || []).join(", ") || "-"}</p>

                <h4>Recommended Actions</h4>
                <p>${(article.business_advice || []).join("<br>") || "-"}</p>
            `;

            container.appendChild(card);

        } catch (error) {
            console.error("AETHER dashboard: skipped a malformed article", error, article);
        }

    });

    wireReportsCarousel(root);

}


// =========================================
// REPORTS CAROUSEL NAV
// =========================================

function wireReportsCarousel(root) {

    const viewport = q(root, "articles");
    const prevBtn = q(root, "reports-prev");
    const nextBtn = q(root, "reports-next");

    if (!viewport || !prevBtn || !nextBtn) {
        return;
    }

    const scrollByCard = (direction) => {
        const card = viewport.querySelector(".aether-report-card");
        const step = card ? card.getBoundingClientRect().width + 16 : viewport.clientWidth * 0.8;
        viewport.scrollBy({ left: step * direction, behavior: "smooth" });
    };

    // Avoid stacking duplicate listeners if buildArticles runs again
    const freshPrev = prevBtn.cloneNode(true);
    const freshNext = nextBtn.cloneNode(true);
    prevBtn.replaceWith(freshPrev);
    nextBtn.replaceWith(freshNext);

    freshPrev.addEventListener("click", () => scrollByCard(-1));
    freshNext.addEventListener("click", () => scrollByCard(1));

}


// =========================================
// LOAD INTELLIGENCE FEED
// =========================================

async function loadAetherDashboard() {

    const root = getDashRoot();

    if (!root) {
        console.error("AETHER dashboard: .aether-dash root not found on this page — is the section markup present?");
        return;
    }

    let data;

    try {

       const source =
    document.querySelector(".aether-dash")?.dataset.newsSrc ||
    "/output/aether_news.json";

fetch(source)

        if (!response.ok) {
            throw new Error(`Fetch failed with status ${response.status}`);
        }

        data = await response.json();

    } catch (error) {

        console.error("AETHER dashboard: failed to load aether_news.json —", error);

        const articles = q(root, "articles");
        if (articles) {
            articles.innerHTML = "<p class=\"aether-empty-note\">Unable to load AETHER intelligence feed.</p>";
        }

        return;

    }

    // From here on, every panel loads independently — one bad field
    // or missing property can no longer take the whole dashboard down.

    runSection("KPI cards", () => {
        const status = q(root, "status");
        const threat = q(root, "threat");
        const confidence = q(root, "confidence");
        const score = q(root, "score");

        if (status) status.textContent = data.status || "UNKNOWN";
        if (threat) threat.textContent = data.intelligence?.threat_level || "-";
        if (confidence) confidence.textContent = (data.intelligence?.ai_confidence ?? "-") + "%";
        if (score) score.textContent = data.intelligence?.top_story_score ?? "-";
    });

    runSection("Trend strip", () => {
        const current = q(root, "current");
        const previous = q(root, "previous");
        const direction = q(root, "direction");

        if (current) current.textContent = data.intelligence?.top_story_score ?? "-";
        if (previous) previous.textContent = data.intelligence?.top_story_score ?? "-";
        if (direction) direction.textContent = "STABLE";
    });

    runSection("Live timestamp", () => {
        const updatedEl = q(root, "live-updated");
        if (updatedEl) {
            updatedEl.textContent = data.updated_at
                ? `Updated: ${data.updated_at}`
                : `Updated: ${formatUpdatedTimestamp(new Date())}`;
        }
    });

    let sectorResult = null;

    runSection("Sector Intelligence Index", () => {
        sectorResult = buildSectorIntelligenceIndex(root, data);
    });

    runSection("Sector Distribution", () => {
        buildSectorDonut(root, sectorResult);
    });

    runSection("Executive summary", () => {
        updateIntelSummary(root, sectorResult);
    });

    runSection("Top Intelligence Reports", () => {
        buildArticles(root, data);
    });

    runSection("Global Risk Map", () => {
        buildGlobalRiskMap(root, data);
    });

}


// =========================================
// START
// =========================================

window.addEventListener("DOMContentLoaded", loadAetherDashboard);
