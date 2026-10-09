// ==========================================================================
// AI RESEARCH DASHBOARD - COMMON CORE SCRIPTS (2026)
// ==========================================================================

// Global toast container
let toastContainer = null;

function ensureToastContainer() {
    if (!toastContainer) {
        toastContainer = document.getElementById("toastContainer");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "toastContainer";
            document.body.appendChild(toastContainer);
        }
    }
}

/**
 * Show modern, non-intrusive toast notification.
 * @param {string} message - Message text
 * @param {'success'|'error'|'info'|'warning'} type - Toast type
 */
function showToast(message, type = "success") {
    ensureToastContainer();

    const toast = document.createElement("div");
    toast.className = `toast-pro toast-${type}`;

    let icon = "bi-check-circle-fill text-success";
    if (type === "error") icon = "bi-exclamation-octagon-fill text-danger";
    else if (type === "info") icon = "bi-info-circle-fill text-info";
    else if (type === "warning") icon = "bi-exclamation-triangle-fill text-warning";

    toast.innerHTML = `
        <i class="bi ${icon} fs-5"></i>
        <div class="flex-grow-1">${message}</div>
        <button type="button" class="btn-close btn-close-white ms-2" style="font-size:10px;"></button>
    `;

    const closeBtn = toast.querySelector(".btn-close");
    if (closeBtn) {
        closeBtn.onclick = () => toast.remove();
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(50px)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Copy text to clipboard and update button UI.
 */
async function copyToClipboard(text, btnElement = null) {
    if (!text || !text.trim()) {
        showToast("Nothing to copy", "info");
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast("Copied to clipboard!", "success");

        if (btnElement) {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `<i class="bi bi-check-lg"></i> Copied`;
            btnElement.disabled = true;
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.disabled = false;
            }, 2000);
        }
    } catch (err) {
        showToast("Failed to copy to clipboard", "error");
    }
}

/**
 * Trigger browser file download from Blob.
 */
function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Configure and render Markdown using marked.js with safe code highlighting.
 */
function renderMarkdown(content) {
    if (typeof marked !== "undefined") {
        try {
            marked.setOptions({
                breaks: true,
                gfm: true
            });
            return marked.parse(content);
        } catch (e) {
            console.error("Markdown parse error:", e);
        }
    }
    // Fallback if marked is unavailable
    return content.replace(/\n/g, "<br>");
}

/**
 * Initialize theme toggle and mobile navigation drawer.
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Theme toggle
    const themeBtn = document.getElementById("themeToggleBtn");
    const currentTheme = localStorage.getItem("ai_theme") || "dark";
    document.documentElement.setAttribute("data-theme", currentTheme);

    if (themeBtn) {
        themeBtn.innerHTML = currentTheme === "light" 
            ? '<i class="bi bi-moon-stars"></i>' 
            : '<i class="bi bi-sun"></i>';

        themeBtn.addEventListener("click", () => {
            const active = document.documentElement.getAttribute("data-theme");
            const newTheme = active === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("ai_theme", newTheme);
            themeBtn.innerHTML = newTheme === "light" 
                ? '<i class="bi bi-moon-stars"></i>' 
                : '<i class="bi bi-sun"></i>';
        });
    }

    // 2. Mobile navigation toggle
    const mobileToggle = document.getElementById("mobileNavToggle");
    const sidebar = document.querySelector(".app-sidebar");

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("show-mobile");
        });

        // Close when clicking outside
        document.addEventListener("click", (e) => {
            if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                sidebar.classList.remove("show-mobile");
            }
        });
    }
});
