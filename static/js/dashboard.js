console.log("Dashboard Loaded");// =====================================
// DASHBOARD.JS
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Dashboard Loaded");

    loadDashboardStats();

    loadRecentActivity();

    setupDashboardCards();

});


// =====================================
// LOAD DASHBOARD STATS
// =====================================

async function loadDashboardStats() {

    try {

        const response = await fetch("/stats");

        const stats = await response.json();

        const totalReports = document.getElementById("totalReports");
        const todayReports = document.getElementById("todayReports");
        const favoriteReports = document.getElementById("favoriteReports");

        if (totalReports)
            totalReports.innerHTML = stats.total;

        if (todayReports)
            todayReports.innerHTML = stats.today;

        if (favoriteReports)
            favoriteReports.innerHTML = stats.favorites;

    }

    catch (err) {

        console.log(err);

    }

}


// =====================================
// LOAD RECENT ACTIVITY
// =====================================

async function loadRecentActivity() {

    const activity = document.getElementById("recentActivity");

    if (!activity)
        return;

    try {

        const response = await fetch("/history");

        const reports = await response.json();

        activity.innerHTML = "";

        if (reports.length === 0) {

            activity.innerHTML = `
                <div class="text-center text-secondary">
                    No recent activity
                </div>
            `;

            return;

        }

        reports.slice(0, 5).forEach(report => {

            activity.innerHTML += `
                <div class="activity-item">

                    <i class="bi bi-file-earmark-text"></i>

                    <span>

                        ${report.topic}

                    </span>

                </div>
            `;

        });

    }

    catch (err) {

        console.log(err);

    }

}


// =====================================
// DASHBOARD CARD EVENTS
// =====================================

function setupDashboardCards() {

    const cards = document.querySelectorAll(".card-box");

    cards.forEach(card => {

        card.addEventListener("mouseenter", () => {

            card.style.transform = "translateY(-8px)";

        });

        card.addEventListener("mouseleave", () => {

            card.style.transform = "translateY(0px)";

        });

    });

}


// =====================================
// QUICK NAVIGATION
// =====================================

function openReports() {

    window.location.href = "/reports";

}

function openPresentation() {

    window.location.href = "/presentation";

}

function openAnalyzer() {

    window.location.href = "/analyzer";

}

function openPaper() {

  window.location.href = "/documents_page";

}

function openChat() {

    window.location.href = "/chat";

}


// =====================================
// REFRESH DASHBOARD
// =====================================

function refreshDashboard() {

    loadDashboardStats();

    loadRecentActivity();

}


// =====================================
// AUTO REFRESH EVERY 60 SECONDS
// =====================================

setInterval(() => {

    loadDashboardStats();

}, 60000);