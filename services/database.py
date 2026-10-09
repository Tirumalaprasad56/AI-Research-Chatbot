import sqlite3
import os
from contextlib import contextmanager
from config import Config

Config.ensure_directories()
DB_PATH = Config.DATABASE_PATH


# ===========================================
# DATABASE CONNECTION
# ===========================================

def get_connection():
    """Create a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def db_session():
    """Context manager for safe database transactions."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ===========================================
# INITIALIZE DATABASE & SCHEMA MIGRATIONS
# ===========================================

def init_db():
    """Initialize database tables and run automatic migrations."""
    Config.ensure_directories()
    
    with db_session() as conn:
        # Users table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            firebase_uid TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Reports table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            topic TEXT NOT NULL,
            report TEXT NOT NULL,
            favorite INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """)

        # Documents table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            content TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """)

        # Chat Threads table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)

        # Chat Messages table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id INTEGER,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
        );
        """)

        # Presentations table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS presentations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            topic TEXT NOT NULL,
            slides_count INTEGER DEFAULT 8,
            theme TEXT DEFAULT 'Modern',
            filepath TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)

        # Migration safety checks for reports
        report_columns = [
            row["name"] for row in conn.execute("PRAGMA table_info(reports)").fetchall()
        ]
        if "user_id" not in report_columns:
            conn.execute("ALTER TABLE reports ADD COLUMN user_id INTEGER;")
        if "favorite" not in report_columns:
            conn.execute("ALTER TABLE reports ADD COLUMN favorite INTEGER DEFAULT 0;")
        if "created_at" not in report_columns:
            conn.execute("ALTER TABLE reports ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")

        # Migration safety checks for documents
        doc_columns = [
            row["name"] for row in conn.execute("PRAGMA table_info(documents)").fetchall()
        ]
        if "filepath" not in doc_columns:
            conn.execute("ALTER TABLE documents ADD COLUMN filepath TEXT;")
        if "uploaded_at" not in doc_columns:
            conn.execute("ALTER TABLE documents ADD COLUMN uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")

        # Migration safety checks for users
        user_columns = [
            row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()
        ]
        if "firebase_uid" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN firebase_uid TEXT;")


# ===========================================
# USERS
# ===========================================

def get_user_by_id(user_id):
    with db_session() as conn:
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def get_user_by_email(email):
    with db_session() as conn:
        return conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email.lower(),)).fetchone()


def get_user_by_firebase_uid(firebase_uid):
    with db_session() as conn:
        return conn.execute("SELECT * FROM users WHERE firebase_uid = ?", (firebase_uid,)).fetchone()


# ===========================================
# REPORTS
# ===========================================

def save_report(user_id, topic, report):
    with db_session() as conn:
        cursor = conn.execute(
            """
            INSERT INTO reports (user_id, topic, report)
            VALUES (?, ?, ?)
            """,
            (user_id, topic, report)
        )
        return cursor.lastrowid


def get_reports(user_id):
    with db_session() as conn:
        return conn.execute(
            """
            SELECT * FROM reports
            WHERE user_id = ?
            ORDER BY favorite DESC, id DESC
            """,
            (user_id,)
        ).fetchall()


def get_report(report_id, user_id=None):
    with db_session() as conn:
        if user_id is not None:
            return conn.execute(
                "SELECT * FROM reports WHERE id = ? AND user_id = ?",
                (report_id, user_id)
            ).fetchone()
        return conn.execute(
            "SELECT * FROM reports WHERE id = ?",
            (report_id,)
        ).fetchone()


def delete_report(report_id, user_id=None):
    with db_session() as conn:
        if user_id is not None:
            conn.execute(
                "DELETE FROM reports WHERE id = ? AND user_id = ?",
                (report_id, user_id)
            )
        else:
            conn.execute("DELETE FROM reports WHERE id = ?", (report_id,))


def toggle_favorite(report_id, user_id=None):
    with db_session() as conn:
        if user_id is not None:
            conn.execute(
                """
                UPDATE reports
                SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END
                WHERE id = ? AND user_id = ?
                """,
                (report_id, user_id)
            )
        else:
            conn.execute(
                """
                UPDATE reports
                SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END
                WHERE id = ?
                """,
                (report_id,)
            )


# ===========================================
# DOCUMENTS
# ===========================================

def save_document(user_id, filename, filepath, content):
    with db_session() as conn:
        cursor = conn.execute(
            """
            INSERT INTO documents (user_id, filename, filepath, content)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, filename, filepath, content)
        )
        return cursor.lastrowid


def get_documents(user_id):
    with db_session() as conn:
        return conn.execute(
            """
            SELECT id, user_id, filename, filepath, uploaded_at,
                   LENGTH(content) as content_length
            FROM documents
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user_id,)
        ).fetchall()


def get_document(document_id, user_id):
    with db_session() as conn:
        return conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (document_id, user_id)
        ).fetchone()


def delete_document(document_id, user_id=None):
    with db_session() as conn:
        if user_id is not None:
            conn.execute(
                "DELETE FROM documents WHERE id = ? AND user_id = ?",
                (document_id, user_id)
            )
        else:
            conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))


def get_document_content(document_id):
    with db_session() as conn:
        row = conn.execute(
            "SELECT content FROM documents WHERE id = ?",
            (document_id,)
        ).fetchone()
        return row["content"] if row else ""


# ===========================================
# CHAT THREADS & MESSAGES
# ===========================================

def create_chat_thread(user_id, title="New Conversation"):
    with db_session() as conn:
        cursor = conn.execute(
            """
            INSERT INTO chat_threads (user_id, title)
            VALUES (?, ?)
            """,
            (user_id, title)
        )
        return cursor.lastrowid


def get_chat_threads(user_id):
    with db_session() as conn:
        return conn.execute(
            """
            SELECT t.id, t.title, t.created_at, t.updated_at,
                   COUNT(m.id) as message_count
            FROM chat_threads t
            LEFT JOIN chat_messages m ON t.id = m.thread_id
            WHERE t.user_id = ?
            GROUP BY t.id
            ORDER BY t.updated_at DESC
            """,
            (user_id,)
        ).fetchall()


def get_chat_thread(thread_id, user_id):
    with db_session() as conn:
        return conn.execute(
            "SELECT * FROM chat_threads WHERE id = ? AND user_id = ?",
            (thread_id, user_id)
        ).fetchone()


def delete_chat_thread(thread_id, user_id):
    with db_session() as conn:
        conn.execute(
            "DELETE FROM chat_messages WHERE thread_id = ?",
            (thread_id,)
        )
        conn.execute(
            "DELETE FROM chat_threads WHERE id = ? AND user_id = ?",
            (thread_id, user_id)
        )


def update_chat_thread_title(thread_id, user_id, title):
    with db_session() as conn:
        conn.execute(
            """
            UPDATE chat_threads
            SET title = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (title, thread_id, user_id)
        )


def save_chat_message(thread_id, role, content):
    with db_session() as conn:
        cursor = conn.execute(
            """
            INSERT INTO chat_messages (thread_id, role, content)
            VALUES (?, ?, ?)
            """,
            (thread_id, role, content)
        )
        conn.execute(
            """
            UPDATE chat_threads
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (thread_id,)
        )
        return cursor.lastrowid


def get_thread_messages(thread_id):
    with db_session() as conn:
        return conn.execute(
            """
            SELECT id, thread_id, role, content, created_at
            FROM chat_messages
            WHERE thread_id = ?
            ORDER BY id ASC
            """,
            (thread_id,)
        ).fetchall()


# ===========================================
# PRESENTATIONS
# ===========================================

def save_presentation(user_id, topic, slides_count, theme, filepath):
    with db_session() as conn:
        cursor = conn.execute(
            """
            INSERT INTO presentations (user_id, topic, slides_count, theme, filepath)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, topic, slides_count, theme, filepath)
        )
        return cursor.lastrowid


def get_presentations(user_id):
    with db_session() as conn:
        return conn.execute(
            """
            SELECT * FROM presentations
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user_id,)
        ).fetchall()


def delete_presentation(pres_id, user_id):
    with db_session() as conn:
        conn.execute(
            "DELETE FROM presentations WHERE id = ? AND user_id = ?",
            (pres_id, user_id)
        )


# ===========================================
# DASHBOARD STATISTICS
# ===========================================

def get_stats(user_id):
    """Retrieve comprehensive statistics for user dashboard."""
    with db_session() as conn:
        total_reports = conn.execute(
            "SELECT COUNT(*) FROM reports WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]

        favorites = conn.execute(
            "SELECT COUNT(*) FROM reports WHERE user_id = ? AND favorite = 1",
            (user_id,)
        ).fetchone()[0]

        today_reports = conn.execute(
            """
            SELECT COUNT(*) FROM reports
            WHERE user_id = ? AND DATE(created_at) = DATE('now')
            """,
            (user_id,)
        ).fetchone()[0]

        total_docs = conn.execute(
            "SELECT COUNT(*) FROM documents WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]

        total_chats = conn.execute(
            "SELECT COUNT(*) FROM chat_threads WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]

        total_presentations = conn.execute(
            "SELECT COUNT(*) FROM presentations WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]

    return {
        "total": total_reports,
        "favorites": favorites,
        "today": today_reports,
        "documents": total_docs,
        "chats": total_chats,
        "presentations": total_presentations
    }