// ==========================================================================
// DASHBOARD LOGIC (2026 PRO EDITION)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    fetchStats();
    fetchRecentReports();
});

async function fetchStats() {
    try {
        const res = await fetch("/stats");
        if (!res.ok) return;
        const data = await res.json();

        document.getElementById("statTotalReports").innerText = data.total ?? 0;
        document.getElementById("statTodayReports").innerText = data.today ?? 0;
        document.getElementById("statFavorites").innerText = data.favorites ?? 0;
        document.getElementById("statDocuments").innerText = data.documents ?? 0;
    } catch (e) {
        console.error("Error loading stats:", e);
    }
}

async function fetchRecentReports() {
    const container = document.getElementById("recentReportsContainer");
    if (!container) return;

    try {
        const res = await fetch("/history");
        if (!res.ok) throw new Error("Failed to load history");
        const reports = await res.json();

        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state-pro py-4">
                    <i class="bi bi-file-earmark-text"></i>
                    <h4>No reports generated yet</h4>
                    <p>Start your first literature survey by entering a research topic.</p>
                    <a href="/reports" class="btn-pro btn-pro-primary btn-sm mt-3">Create First Report</a>
                </div>
            `;
            return;
        }

        // Render top 5 reports
        const topReports = reports.slice(0, 5);
        let html = '<div class="d-flex flex-column gap-2">';

        topReports.forEach(r => {
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : '';
            html += `
                <div class="history-item-pro" onclick="window.location.href='/reports?id=${r.id}'">
                    <div class="d-flex align-items-center gap-2 overflow-hidden">
                        <i class="bi ${r.favorite ? 'bi-star-fill text-warning' : 'bi-file-earmark-text text-primary'}"></i>
                        <span class="history-text" title="${r.topic}">${r.topic}</span>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <span class="text-muted small">${dateStr}</span>
                        <i class="bi bi-chevron-right text-muted small"></i>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    } catch (e) {
        console.error("Error loading recent reports:", e);
        container.innerHTML = `
            <div class="alert alert-danger py-2 small mb-0">
                Failed to load recent activity.
            </div>
        `;
    }
}

function launchTopic(topicName) {
    window.location.href = `/reports?topic=${encodeURIComponent(topicName)}`;
}