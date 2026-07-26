// =====================================
// COMMON VARIABLES
// =====================================

let currentDocument = null;


// =====================================
// SHOW ALERT
// =====================================

function showAlert(message, type = "success") {

    const div = document.createElement("div");

    div.className = `alert alert-${type}`;

    div.innerHTML = message;

    document.body.prepend(div);

    setTimeout(() => {

        div.remove();

    }, 3000);

}


// =====================================
// SHOW LOADING
// =====================================

function showLoading(elementId, message = "Loading...") {

    const element = document.getElementById(elementId);

    if (!element) return;

    element.innerHTML = `
        <div class="alert alert-info">
            <div class="spinner-border spinner-border-sm me-2"></div>
            ${message}
        </div>
    `;

}


// =====================================
// HIDE LOADING
// =====================================

function hideLoading(elementId) {

    const element = document.getElementById(elementId);

    if (!element) return;

    element.innerHTML = "";

}


// =====================================
// COPY TO CLIPBOARD
// =====================================

function copyText(text) {

    navigator.clipboard.writeText(text);

}


// =====================================
// DOWNLOAD FILE
// =====================================

function downloadBlob(blob, filename) {

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = filename;

    document.body.appendChild(a);

    a.click();

    a.remove();

    window.URL.revokeObjectURL(url);

}


// =====================================
// FETCH JSON
// =====================================

async function fetchJSON(url, options = {}) {

    const response = await fetch(url, options);

    return await response.json();

}


// =====================================
// FETCH BLOB
// =====================================

async function fetchBlob(url, options = {}) {

    const response = await fetch(url, options);

    return await response.blob();

}


// =====================================
// FORMAT MARKDOWN
// =====================================

function renderMarkdown(text) {

    if (typeof marked !== "undefined") {

        return marked.parse(text);

    }

    return text;

}