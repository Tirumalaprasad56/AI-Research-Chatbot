import os
import sys

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from config import Config
from services.database import (
    init_db,
    db_session,
    save_report,
    get_reports,
    create_chat_thread,
    save_chat_message,
    get_thread_messages,
    save_presentation,
    get_presentations
)
from services.auth_service import register_user, login_user
from services.document_service import get_text_stats, clean_text
from services.export_service import create_pdf, create_docx, create_markdown
from services.ppt_service import create_presentation
import app

def test_system():
    print("="*60)
    print("STARTING COMPLETE UPGRADE VERIFICATION")
    print("="*60)

    # 1. Config & Folders
    Config.ensure_directories()
    assert os.path.exists(Config.UPLOAD_FOLDER), "Upload folder missing"
    assert os.path.exists(Config.EXPORT_FOLDER), "Export folder missing"
    assert os.path.exists(Config.PPT_FOLDER), "PPT folder missing"
    print(" [1/7] Directories verified.")

    # 2. Database & Migrations
    init_db()
    with db_session() as conn:
        tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        for expected in ["users", "reports", "documents", "chat_threads", "chat_messages", "presentations"]:
            assert expected in tables, f"Missing table {expected}"
    print(f" [2/7] Database schema verified with tables: {', '.join(tables)}")

    # 3. Auth Service & Firebase User Synchronization
    test_email = "tester_2026@university.edu"
    test_pass = "SecurePass123!"
    with db_session() as conn:
        conn.execute("DELETE FROM users WHERE email = ?", (test_email,))
    
    register_user("Dr. Tester", test_email, test_pass)
    user = login_user(test_email, test_pass)
    assert user is not None, "Login failed for registered user"
    assert user["email"] == test_email, "User email mismatch"
    
    # Test Firebase synchronization: linking existing account by email
    from services.auth_service import sync_firebase_user
    fb_uid_1 = "test_fb_uid_12345"
    synced_user = sync_firebase_user(fb_uid_1, test_email, "Dr. Tester")
    assert synced_user["firebase_uid"] == fb_uid_1, "Firebase UID was not linked"
    assert synced_user["id"] == user["id"], "Failed to link existing user by email"

    # Test Firebase synchronization: creating brand new Firebase user
    fb_uid_2 = "test_fb_uid_67890"
    new_fb_email = "new_fb_researcher@mit.edu"
    with db_session() as conn:
        conn.execute("DELETE FROM users WHERE email = ? OR firebase_uid = ?", (new_fb_email, fb_uid_2))
    new_user = sync_firebase_user(fb_uid_2, new_fb_email, "Dr. Firebase")
    assert new_user["firebase_uid"] == fb_uid_2, "Failed to create new Firebase user"
    assert new_user["username"] == "Dr. Firebase", "Username mismatch for Firebase user"
    print(f" [3/7] Auth & Firebase synchronization verified (linked ID: {synced_user['id']}, new ID: {new_user['id']})")


    # 4. Unicode-safe Export Service (PDF, DOCX, Markdown)
    sample_academic_text = """
# Comprehensive Research Report: Advanced AI Reasoning

## Abstract
Recent advances in Large Language Models (LLMs) & Deep Learning have transformed scientific workflows—delivering up to 99.8% precision on complex benchmarks.

## Methodology
- Step 1: Data tokenization & self-attention formulation
- Step 2: Contextual alignment with human-in-the-loop (RLHF)
- Step 3: Empirical evaluation across domain datasets (p < 0.01)

### Key Equations & Findings
Formula: f(x) = softmax(QK^T / sqrt(d_k)) * V
Quotation: "The greatest breakthroughs emerge at the intersection of theory and empirical rigor."

## References
1. Vaswani, A., et al. (2017). Attention Is All You Need. NeurIPS.
2. Brown, T., et al. (2020). Language Models are Few-Shot Learners. NeurIPS.
"""
    pdf_path = create_pdf(sample_academic_text, title="Test Report")
    assert os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0, "PDF export failed"
    docx_path = create_docx(sample_academic_text, title="Test Report")
    assert os.path.exists(docx_path) and os.path.getsize(docx_path) > 0, "DOCX export failed"
    md_path = create_markdown(sample_academic_text, title="Test Report")
    assert os.path.exists(md_path) and os.path.getsize(md_path) > 0, "Markdown export failed"
    print(" [4/7] PDF, DOCX, and Markdown export engines verified successfully.")

    # 5. Multi-Theme Presentation Generator
    slides = [
        {"title": "Autonomous AI Agents in 2026", "subtitle": "Executive Overview", "points": ["State-of-the-art multi-agent planning", "Tool execution and environment feedback", "Empirical efficiency across benchmarks"]},
        {"title": "Algorithmic Architecture", "subtitle": "Methodology", "points": ["Hierarchical task decomposition", "Memory retrieval via vector embeddings", "Low-latency inference on Groq LPUs"]},
        {"title": "Conclusion & Next Steps", "subtitle": "Takeaways", "points": ["Ready for production deployment", "Autonomous workflow integration", "Scalable cloud orchestration"]}
    ]
    ppt_path = create_presentation("Autonomous AI Agents", slides, theme_name="Modern")
    assert os.path.exists(ppt_path) and os.path.getsize(ppt_path) > 0, "Presentation generation failed"
    print(" [5/7] PowerPoint 16:9 widescreen presentation deck verified.")

    # 6. Persistent Chat Threads & Presentations in DB
    thread_id = create_chat_thread(user["id"], title="Test Research Thread")
    save_chat_message(thread_id, "user", "What are diffusion models?")
    save_chat_message(thread_id, "assistant", "Diffusion models are generative models based on denoising.")
    messages = get_thread_messages(thread_id)
    assert len(messages) == 2, f"Expected 2 messages, got {len(messages)}"

    save_presentation(user["id"], "Autonomous AI Agents", len(slides), "Modern", ppt_path)
    pres_list = get_presentations(user["id"])
    assert len(pres_list) > 0, "Expected saved presentation"
    print(" [6/7] Chat thread persistence & presentation history verified in SQLite.")

    # 7. Flask Test Client & Endpoint Health
    client = app.app.test_client()
    res_health = client.get("/health")
    assert res_health.status_code == 200, f"Health check failed: {res_health.status_code}"
    health_json = res_health.get_json()
    assert health_json["status"] == "healthy", "Health status not healthy"

    res_root = client.get("/")
    assert res_root.status_code in (302, 200), f"Root route failed: {res_root.status_code}"

    res_login = client.get("/login")
    assert res_login.status_code == 200, f"Login page failed: {res_login.status_code}"

    res_register = client.get("/register")
    assert res_register.status_code == 200, f"Register page failed: {res_register.status_code}"

    # Log in test client
    with client.session_transaction() as sess:
        sess["user_id"] = user["id"]
        sess["username"] = user["username"]

    res_dash = client.get("/dashboard")
    assert res_dash.status_code == 200, f"Dashboard failed: {res_dash.status_code}"

    res_reports = client.get("/reports")
    assert res_reports.status_code == 200, f"Reports page failed: {res_reports.status_code}"

    res_pres = client.get("/presentation")
    assert res_pres.status_code == 200, f"Presentation page failed: {res_pres.status_code}"

    res_analyzer = client.get("/analyzer")
    assert res_analyzer.status_code == 200, f"Analyzer page failed: {res_analyzer.status_code}"

    res_docs = client.get("/documents")
    assert res_docs.status_code == 200, f"Documents page failed: {res_docs.status_code}"

    res_chat = client.get("/chat")
    assert res_chat.status_code == 200, f"Chat page failed: {res_chat.status_code}"

    res_stats = client.get("/stats")
    assert res_stats.status_code == 200, f"Stats API failed: {res_stats.status_code}"

    print(" [7/7] Flask web client routes & APIs verified (Health, Dashboard, Reports, Presentations, Analyzer, Chat, Stats).")
    print("="*60)
    print("ALL 7 SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("="*60)

if __name__ == "__main__":
    test_system()
