// =====================================
// REPORTS PAGE
// =====================================

// =====================================
// ELEMENTS
// =====================================

const generateBtn = document.getElementById("generateBtn");

const topicInput = document.getElementById("topic");

const report = document.getElementById("report");

const loading = document.getElementById("loading");

const copyBtn = document.getElementById("copyBtn");


// =====================================
// GENERATE REPORT
// =====================================

if (generateBtn) {

    generateBtn.onclick = async () => {

        const topic = topicInput.value.trim();

        if (topic === "") {

            alert("Please enter a research topic.");

            return;

        }

        loading.style.display = "block";

        report.innerHTML = "";

        generateBtn.disabled = true;

        try {

            const response = await fetch("/generate", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    topic: topic

                })

            });

            const data = await response.json();

            loading.style.display = "none";

            generateBtn.disabled = false;

            if (data.error) {

                report.innerHTML = `
                    <div class="alert alert-danger">
                        ${data.error}
                    </div>
                `;

                return;

            }

            report.innerHTML = marked.parse(data.report);

            loadHistory();

            loadStats();

        }

        catch (err) {

            loading.style.display = "none";

            generateBtn.disabled = false;

            report.innerHTML = `
                <div class="alert alert-danger">
                    ${err}
                </div>
            `;

        }

    };

}


// =====================================
// COPY REPORT
// =====================================

if (copyBtn) {

    copyBtn.onclick = () => {

        const text = report.innerText.trim();

        if (text === "") {

            alert("No report available.");

            return;

        }

        navigator.clipboard.writeText(text);

        copyBtn.innerHTML = `
            <i class="bi bi-check-circle"></i>
            Copied
        `;

        setTimeout(() => {

            copyBtn.innerHTML = `
                <i class="bi bi-clipboard"></i>
                Copy
            `;

        }, 2000);

    };

}
// =====================================
// LOAD REPORT HISTORY
// =====================================

async function loadHistory() {

    const history = document.getElementById("history");

    if (!history)
        return;

    try {

        const response = await fetch("/history");

        const reports = await response.json();

        history.innerHTML = "";

        if (reports.length === 0) {

            history.innerHTML = `
                <div class="text-center text-secondary p-3">
                    No reports available.
                </div>
            `;

            return;

        }

        reports.forEach(reportItem => {

            const row = document.createElement("div");

            row.className = "history-item";

            row.innerHTML = `

                <span class="report-name">

                    ${reportItem.favorite ? "⭐" : "📄"}

                    ${reportItem.topic}

                </span>

                <div>

                    <button
                        class="btn btn-warning btn-sm favorite-btn">

                        ⭐

                    </button>

                    <button
                        class="btn btn-danger btn-sm delete-btn">

                        🗑

                    </button>

                </div>

            `;

            row.querySelector(".report-name")
                .addEventListener("click", () => {

                    openReport(reportItem.id);

                });

            row.querySelector(".favorite-btn")
                .addEventListener("click", () => {

                    favoriteReport(reportItem.id);

                });

            row.querySelector(".delete-btn")
                .addEventListener("click", () => {

                    deleteReport(reportItem.id);

                });

            history.appendChild(row);

        });

    }

    catch (err) {

        console.log(err);

    }

}


// =====================================
// OPEN REPORT
// =====================================

async function openReport(id) {

    try {

        const response = await fetch(`/report/${id}`);

        const data = await response.json();

        if (data.error) {

            alert(data.error);

            return;

        }

        report.innerHTML = marked.parse(data.report);

    }

    catch (err) {

        console.log(err);

    }

}


// =====================================
// DELETE REPORT
// =====================================

async function deleteReport(id) {

    if (!confirm("Delete this report?"))
        return;

    try {

        const response = await fetch(`/delete/${id}`, {

            method: "DELETE"

        });

        const data = await response.json();

        if (data.error) {

            alert(data.error);

            return;

        }

        report.innerHTML = "";

        loadHistory();

        loadStats();

    }

    catch (err) {

        console.log(err);

    }

}


// =====================================
// FAVORITE REPORT
// =====================================

async function favoriteReport(id) {

    try {

        const response = await fetch(`/favorite/${id}`, {

            method: "POST"

        });

        const data = await response.json();

        if (data.error) {

            alert(data.error);

            return;

        }

        loadHistory();

        loadStats();

    }

    catch (err) {

        console.log(err);

    }

}
// =====================================
// EXPORT PDF
// =====================================

const pdfBtn = document.getElementById("pdfBtn");

if (pdfBtn) {

    pdfBtn.onclick = async () => {

        const text = report.innerText.trim();

        if (text === "") {

            alert("No report available.");

            return;

        }

        pdfBtn.disabled = true;

        pdfBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm"></span>
            Exporting...
        `;

        try {

            const response = await fetch("/export/pdf", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    report: text

                })

            });

            if (!response.ok) {

                throw new Error("PDF export failed.");

            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");

            a.href = url;

            a.download = "Research_Report.pdf";

            document.body.appendChild(a);

            a.click();

            a.remove();

            window.URL.revokeObjectURL(url);

        }

        catch (err) {

            alert(err.message);

        }

        finally {

            pdfBtn.disabled = false;

            pdfBtn.innerHTML = `
                <i class="bi bi-file-earmark-pdf"></i>
                PDF
            `;

        }

    };

}


// =====================================
// EXPORT WORD
// =====================================

const docBtn = document.getElementById("docBtn");

if (docBtn) {

    docBtn.onclick = async () => {

        const text = report.innerText.trim();

        if (text === "") {

            alert("No report available.");

            return;

        }

        docBtn.disabled = true;

        docBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm"></span>
            Exporting...
        `;

        try {

            const response = await fetch("/export/docx", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    report: text

                })

            });

            if (!response.ok) {

                throw new Error("Word export failed.");

            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");

            a.href = url;

            a.download = "Research_Report.docx";

            document.body.appendChild(a);

            a.click();

            a.remove();

            window.URL.revokeObjectURL(url);

        }

        catch (err) {

            alert(err.message);

        }

        finally {

            docBtn.disabled = false;

            docBtn.innerHTML = `
                <i class="bi bi-file-earmark-word"></i>
                Word
            `;

        }

    };

}
// =====================================
// DASHBOARD STATISTICS
// =====================================

async function loadStats() {

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
// SEARCH REPORTS
// =====================================

const search = document.getElementById("search");

if (search) {

    search.addEventListener("keyup", function () {

        const value = this.value.toLowerCase();

        document.querySelectorAll(".history-item").forEach(item => {

            item.style.display =

                item.innerText.toLowerCase().includes(value)

                    ? "flex"

                    : "none";

        });

    });

}


// =====================================
// NEW REPORT
// =====================================

const newChat = document.getElementById("newChat");

if (newChat) {

    newChat.onclick = () => {

        if (topicInput)
            topicInput.value = "";

        if (report)
            report.innerHTML = "";

        if (topicInput)
            topicInput.focus();

    };

}


// =====================================
// CLEAR REPORT
// =====================================

function clearReport() {

    if (topicInput)
        topicInput.value = "";

    if (report)
        report.innerHTML = "";

}


// =====================================
// REFRESH REPORTS
// =====================================

function refreshReports() {

    loadHistory();

    loadStats();

}


// =====================================
// ENTER KEY SUPPORT
// =====================================

if (topicInput) {

    topicInput.addEventListener("keypress", function (event) {

        if (event.key === "Enter") {

            generateBtn.click();

        }

    });

}


// =====================================
// INITIAL LOAD
// =====================================

window.addEventListener("DOMContentLoaded", () => {

    console.log("Reports Module Loaded");

    loadHistory();

    loadStats();

});