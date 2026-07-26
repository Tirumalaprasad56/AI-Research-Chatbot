import sqlite3
import os

DB_PATH = os.path.join("database", "research.db")


# ===========================================
# DATABASE CONNECTION
# ===========================================

def get_connection():

    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    return conn


# ===========================================
# INITIALIZE DATABASE
# ===========================================

def init_db():

    os.makedirs("database", exist_ok=True)

    conn = get_connection()

    # ===========================================
    # USERS TABLE
    # ===========================================

    conn.execute("""
    CREATE TABLE IF NOT EXISTS users(

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        username TEXT NOT NULL,

        email TEXT UNIQUE NOT NULL,

        password TEXT NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    )
    """)

    # ===========================================
    # REPORTS TABLE
    # ===========================================

    conn.execute("""
    CREATE TABLE IF NOT EXISTS reports(

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER,

        topic TEXT NOT NULL,

        report TEXT NOT NULL,

        favorite INTEGER DEFAULT 0,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(user_id)
        REFERENCES users(id)

    )
    """)

    # ===========================================
    # DOCUMENTS TABLE
    # ===========================================

    conn.execute("""
    CREATE TABLE IF NOT EXISTS documents(

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER,

        filename TEXT NOT NULL,

        filepath TEXT NOT NULL,

        content TEXT NOT NULL,

        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(user_id)
        REFERENCES users(id)

    )
    """)

    # ===========================================
    # AUTO UPGRADE REPORTS TABLE
    # ===========================================

    report_columns = [

        row["name"]

        for row in conn.execute(

            "PRAGMA table_info(reports)"

        ).fetchall()

    ]

    if "user_id" not in report_columns:

        conn.execute("""

        ALTER TABLE reports

        ADD COLUMN user_id INTEGER

        """)

    if "favorite" not in report_columns:

        conn.execute("""

        ALTER TABLE reports

        ADD COLUMN favorite INTEGER DEFAULT 0

        """)

    if "created_at" not in report_columns:

        conn.execute("""

        ALTER TABLE reports

        ADD COLUMN created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP

        """)

    # ===========================================
    # AUTO UPGRADE DOCUMENTS TABLE
    # ===========================================

    document_columns = [

        row["name"]

        for row in conn.execute(

            "PRAGMA table_info(documents)"

        ).fetchall()

    ]

    if "filepath" not in document_columns:

        conn.execute("""

        ALTER TABLE documents

        ADD COLUMN filepath TEXT

        """)

    if "uploaded_at" not in document_columns:

        conn.execute("""

        ALTER TABLE documents

        ADD COLUMN uploaded_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP

        """)

    conn.commit()

    conn.close()
# ===========================================
# SAVE REPORT
# ===========================================

def save_report(user_id, topic, report):

    conn = get_connection()

    conn.execute(
        """
        INSERT INTO reports
        (
            user_id,
            topic,
            report
        )
        VALUES (?, ?, ?)
        """,
        (
            user_id,
            topic,
            report
        )
    )

    conn.commit()

    conn.close()


# ===========================================
# GET ALL REPORTS
# ===========================================

def get_reports(user_id):

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT *
        FROM reports
        WHERE user_id=?
        ORDER BY id DESC
        """,
        (user_id,)
    ).fetchall()

    conn.close()

    return rows


# ===========================================
# GET SINGLE REPORT
# ===========================================

def get_report(report_id):

    conn = get_connection()

    row = conn.execute(
        """
        SELECT *
        FROM reports
        WHERE id=?
        """,
        (report_id,)
    ).fetchone()

    conn.close()

    return row


# ===========================================
# DELETE REPORT
# ===========================================

def delete_report(report_id):

    conn = get_connection()

    conn.execute(
        """
        DELETE FROM reports
        WHERE id=?
        """,
        (report_id,)
    )

    conn.commit()

    conn.close()


# ===========================================
# FAVORITE REPORT
# ===========================================

def toggle_favorite(report_id):

    conn = get_connection()

    conn.execute(
        """
        UPDATE reports

        SET favorite =
        CASE

            WHEN favorite=1 THEN 0

            ELSE 1

        END

        WHERE id=?
        """,
        (report_id,)
    )

    conn.commit()

    conn.close()


# ===========================================
# DASHBOARD STATISTICS
# ===========================================

def get_stats(user_id):

    conn = get_connection()

    total = conn.execute(
        """
        SELECT COUNT(*)
        FROM reports
        WHERE user_id=?
        """,
        (user_id,)
    ).fetchone()[0]

    favorites = conn.execute(
        """
        SELECT COUNT(*)
        FROM reports
        WHERE user_id=?
        AND favorite=1
        """,
        (user_id,)
    ).fetchone()[0]

    today = conn.execute(
        """
        SELECT COUNT(*)
        FROM reports
        WHERE user_id=?
        AND DATE(created_at)=DATE('now')
        """,
        (user_id,)
    ).fetchone()[0]

    conn.close()

    return {

        "total": total,

        "favorites": favorites,

        "today": today

    }
# ===========================================
# SAVE DOCUMENT
# ===========================================

def save_document(user_id, filename, filepath, content):

    conn = get_connection()

    conn.execute(
        """
        INSERT INTO documents
        (
            user_id,
            filename,
            filepath,
            content
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            user_id,
            filename,
            filepath,
            content
        )
    )

    conn.commit()

    conn.close()


# ===========================================
# GET ALL DOCUMENTS
# ===========================================

def get_documents(user_id):

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT *
        FROM documents
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (user_id,)
    ).fetchall()

    conn.close()

    return rows


# ===========================================
# GET SINGLE DOCUMENT
# ===========================================

def get_document(document_id, user_id):

    conn = get_connection()

    row = conn.execute(
        """
        SELECT *
        FROM documents
        WHERE id = ?
        AND user_id = ?
        """,
        (document_id, user_id)
    ).fetchone()

    conn.close()

    return row

# ===========================================
# DELETE DOCUMENT
# ===========================================

def delete_document(document_id):

    conn = get_connection()

    conn.execute(
        """
        DELETE FROM documents
        WHERE id = ?
        """,
        (document_id,)
    )

    conn.commit()

    conn.close()
def get_document_content(document_id):

    conn = get_connection()

    row = conn.execute(
        """
        SELECT content
        FROM documents
        WHERE id=?
        """,
        (document_id,)
    ).fetchone()

    conn.close()

    if row:
        return row["content"]

    return ""