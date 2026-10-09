// ==========================================================================
// AI CHAT STUDIO LOGIC (2026 PERSISTENT PRO EDITION)
// ==========================================================================

let activeThreadId = null;
let allThreadsCache = [];

document.addEventListener("DOMContentLoaded", () => {
    setupChatEvents();
    loadChatThreads();
});

function setupChatEvents() {
    const sendBtn = document.getElementById("sendChatBtn");
    const inputMsg = document.getElementById("chatInputMessage");
    const newThreadBtn = document.getElementById("newChatThreadBtn");
    const searchInput = document.getElementById("threadSearchInput");
    const clearViewBtn = document.getElementById("clearChatViewBtn");

    if (sendBtn) sendBtn.onclick = handleSendMessage;

    if (inputMsg) {
        inputMsg.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    if (newThreadBtn) {
        newThreadBtn.onclick = startNewThread;
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            filterThreads(e.target.value);
        });
    }

    if (clearViewBtn) {
        clearViewBtn.onclick = () => {
            const stream = document.getElementById("chatMessagesStream");
            stream.innerHTML = `
                <div class="empty-state-pro py-5">
                    <i class="bi bi-chat-heart display-4 text-muted"></i>
                    <p class="mt-2">Chat view cleared. Type below to continue.</p>
                </div>
            `;
        };
    }
}

function startNewThread() {
    activeThreadId = null;
    document.getElementById("activeChatTitle").innerText = "New Research Conversation";
    document.getElementById("activeChatSubtitle").innerText = "Powered by Groq High-Speed LLM";
    
    const stream = document.getElementById("chatMessagesStream");
    stream.innerHTML = `
        <div id="chatWelcomeScreen">
            <div class="text-center py-5">
                <div class="brand-icon mx-auto mb-3" style="width:56px;height:56px;font-size:26px;">
                    <i class="bi bi-robot"></i>
                </div>
                <h4 class="text-white">AI Research Copilot</h4>
                <p class="text-muted mx-auto" style="max-width: 500px;">
                    Ask complex scientific questions, formulate methodology, solve algorithmic problems, or review paper concepts.
                </p>
                <div class="d-flex flex-wrap justify-content-center gap-2 mt-4" style="max-width: 650px; margin: 0 auto;">
                    <button class="chip-btn py-2 px-3 text-start" onclick="sendPromptPreset('Explain the Transformer self-attention mechanism and scaled dot-product mathematically.')">
                        💡 Transformer Self-Attention Math
                    </button>
                    <button class="chip-btn py-2 px-3 text-start" onclick="sendPromptPreset('How to identify and articulate a compelling Research Gap in a literature survey?')">
                        🔍 How to Articulate a Research Gap
                    </button>
                    <button class="chip-btn py-2 px-3 text-start" onclick="sendPromptPreset('Compare Vision Transformers (ViT) vs Convolutional Neural Networks (CNN) for medical image segmentation.')">
                        📊 ViT vs CNN in Medical Imaging
                    </button>
                </div>
            </div>
        </div>
    `;

    document.querySelectorAll(".history-item-pro").forEach(el => el.classList.remove("active"));
    document.getElementById("chatInputMessage").focus();
}

function sendPromptPreset(promptText) {
    const input = document.getElementById("chatInputMessage");
    input.value = promptText;
    handleSendMessage();
}

async function handleSendMessage() {
    const input = document.getElementById("chatInputMessage");
    const sendBtn = document.getElementById("sendChatBtn");
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = "";

    // Remove welcome screen if present
    const welcome = document.getElementById("chatWelcomeScreen");
    if (welcome) welcome.remove();

    // Render User Message
    appendUserBubble(message);

    // Render typing indicator
    const typingId = appendTypingIndicator();

    sendBtn.disabled = true;

    try {
        const res = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                thread_id: activeThreadId
            })
        });

        const data = await res.json();
        removeTypingIndicator(typingId);

        if (!res.ok || data.error) throw new Error(data.error || "AI synthesis failed");

        // Update active thread ID if newly created
        if (!activeThreadId && data.thread_id) {
            activeThreadId = data.thread_id;
            document.getElementById("activeChatTitle").innerText = message.substring(0, 32);
            await loadChatThreads();
        }

        appendAssistantBubble(data.answer);
    } catch (err) {
        removeTypingIndicator(typingId);
        appendAssistantBubble(`⚠️ **Error:** ${err.message}`);
        showToast(err.message, "error");
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
}

function appendUserBubble(message) {
    const stream = document.getElementById("chatMessagesStream");
    const bubble = document.createElement("div");
    bubble.className = "d-flex justify-content-end mb-3";
    bubble.innerHTML = `
        <div class="d-flex align-items-start gap-2" style="max-width: 80%;">
            <div class="p-3 rounded-3" style="background: var(--accent-primary); color: #ffffff; border-radius: 16px 16px 4px 16px !important; box-shadow: var(--shadow-sm);">
                <div style="white-space: pre-wrap; font-size: 14.5px;">${escapeHtml(message)}</div>
            </div>
            <div class="user-avatar flex-shrink-0" style="width:32px;height:32px;font-size:12px;">U</div>
        </div>
    `;
    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;
}

function appendAssistantBubble(content) {
    const stream = document.getElementById("chatMessagesStream");
    const bubble = document.createElement("div");
    bubble.className = "d-flex justify-content-start mb-4";
    bubble.innerHTML = `
        <div class="d-flex align-items-start gap-2" style="max-width: 85%;">
            <div class="brand-icon flex-shrink-0" style="width:32px;height:32px;font-size:14px;">
                <i class="bi bi-robot"></i>
            </div>
            <div class="p-3 rounded-3 markdown-body-pro" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 4px 16px 16px 16px !important; box-shadow: var(--shadow-sm); width: 100%;">
                ${renderMarkdown(content)}
            </div>
        </div>
    `;
    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;
}

function appendTypingIndicator() {
    const stream = document.getElementById("chatMessagesStream");
    const id = `typing-${Date.now()}`;
    const indicator = document.createElement("div");
    indicator.id = id;
    indicator.className = "d-flex justify-content-start mb-3";
    indicator.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <div class="brand-icon flex-shrink-0" style="width:32px;height:32px;font-size:14px;">
                <i class="bi bi-robot"></i>
            </div>
            <div class="p-3 rounded-3 d-flex align-items-center gap-2" style="background: var(--bg-card); border: 1px solid var(--border-subtle);">
                <span class="spinner-grow spinner-grow-sm text-primary" role="status"></span>
                <span class="spinner-grow spinner-grow-sm text-info" role="status"></span>
                <span class="spinner-grow spinner-grow-sm text-secondary" role="status"></span>
                <span class="text-muted small ms-2">Groq AI is thinking...</span>
            </div>
        </div>
    `;
    stream.appendChild(indicator);
    stream.scrollTop = stream.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

async function loadChatThreads() {
    const container = document.getElementById("chatThreadListContainer");
    if (!container) return;

    try {
        const res = await fetch("/api/chat/threads");
        if (!res.ok) return;
        allThreadsCache = await res.json();
        renderThreadsList(allThreadsCache);
    } catch (e) {
        console.error("Error loading chat threads:", e);
    }
}

function renderThreadsList(threads) {
    const container = document.getElementById("chatThreadListContainer");
    if (!container) return;

    if (!threads || threads.length === 0) {
        container.innerHTML = `
            <div class="empty-state-pro py-4">
                <i class="bi bi-chat-dots fs-3"></i>
                <p class="small mb-0">No conversations yet.</p>
            </div>
        `;
        return;
    }

    let html = '<div class="d-flex flex-column gap-1">';
    threads.forEach(t => {
        const isCurrent = activeThreadId === t.id;
        html += `
            <div class="history-item-pro py-2 ${isCurrent ? 'active' : ''}" id="thread-row-${t.id}" onclick="openChatThread(${t.id})">
                <div class="history-text" title="${t.title}">
                    <i class="bi bi-chat-left-text me-1 text-muted" style="font-size:12px;"></i>
                    <span style="font-size:13px;">${t.title}</span>
                </div>
                <div class="history-actions" onclick="event.stopPropagation()">
                    <button type="button" class="btn-icon-tiny delete-hover" onclick="deleteThreadItem(${t.id})" title="Delete">
                        <i class="bi bi-trash3" style="font-size:11px;"></i>
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function filterThreads(query) {
    if (!query || !query.trim()) {
        renderThreadsList(allThreadsCache);
        return;
    }
    const q = query.toLowerCase();
    const filtered = allThreadsCache.filter(t => t.title.toLowerCase().includes(q));
    renderThreadsList(filtered);
}

async function openChatThread(threadId) {
    try {
        const res = await fetch(`/api/chat/threads/${threadId}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed to load thread");

        activeThreadId = data.thread.id;
        document.getElementById("activeChatTitle").innerText = data.thread.title;

        // Clear and render messages
        const stream = document.getElementById("chatMessagesStream");
        stream.innerHTML = "";

        data.messages.forEach(m => {
            if (m.role === "user") {
                appendUserBubble(m.content);
            } else {
                appendAssistantBubble(m.content);
            }
        });

        document.querySelectorAll(".history-item-pro").forEach(el => el.classList.remove("active"));
        const row = document.getElementById(`thread-row-${threadId}`);
        if (row) row.classList.add("active");
    } catch (e) {
        showToast(e.message, "error");
    }
}

async function deleteThreadItem(threadId) {
    if (!confirm("Delete this conversation thread?")) return;

    try {
        const res = await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");

        showToast("Conversation deleted", "info");
        if (activeThreadId === threadId) {
            startNewThread();
        }
        await loadChatThreads();
    } catch (e) {
        showToast("Error deleting thread", "error");
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}