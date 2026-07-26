from werkzeug.security import generate_password_hash, check_password_hash

from services.database import get_connection


def register_user(username, email, password):

    conn = get_connection()

    hashed = generate_password_hash(password)

    conn.execute(
        """
        INSERT INTO users(username,email,password)
        VALUES(?,?,?)
        """,
        (username, email, hashed)
    )

    conn.commit()
    conn.close()


def login_user(email, password):

    conn = get_connection()

    user = conn.execute(
        """
        SELECT *
        FROM users
        WHERE email=?
        """,
        (email,)
    ).fetchone()

    conn.close()

    if user and check_password_hash(
        user["password"],
        password
    ):
        return user

    return None