
import uuid
import requests

from werkzeug.security import generate_password_hash, check_password_hash

from services.database import get_connection
from config import Config


# ============================================================
# 1. LEGACY USER REGISTRATION
# ============================================================

def register_user(username, email, password):
    """Register a local user using a hashed password."""

    username = (username or "").strip()
    email = (email or "").strip().lower()

    if not username or not email or not password:
        raise ValueError("Username, email, and password are required.")

    hashed_password = generate_password_hash(password)
    conn = get_connection()

    try:
        conn.execute(
            """
            INSERT INTO users (username, email, password)
            VALUES (?, ?, ?)
            """,
            (username, email, hashed_password)
        )
        conn.commit()

    finally:
        conn.close()


# ============================================================
# 2. LEGACY USER LOGIN
# ============================================================

def login_user(email, password):
    """Authenticate a legacy local account."""

    email = (email or "").strip().lower()

    if not email or not password:
        return None

    conn = get_connection()

    try:
        user = conn.execute(
            """
            SELECT *
            FROM users
            WHERE LOWER(email) = ?
            """,
            (email,)
        ).fetchone()

        if user and user["password"] and check_password_hash(
            user["password"], password
        ):
            return dict(user)

        return None

    finally:
        conn.close()


# ============================================================
# 3. FIREBASE USER SYNCHRONIZATION
# ============================================================

def sync_firebase_user(firebase_uid, email, username=None):
    """
    Synchronize a verified Firebase user with the local SQLite database.

    Call this function only after verifying the Firebase ID token
    and enforcing the application's email-verification policy.
    """

    firebase_uid = (firebase_uid or "").strip()
    email = (email or "").strip().lower()
    username = (username or "").strip()

    if not firebase_uid or not email:
        raise ValueError("Firebase UID and email are required.")

    if not username:
        username = email.split("@")[0] or "Researcher"

    conn = get_connection()

    try:
        # First, look for the Firebase UID.
        user = conn.execute(
            """
            SELECT *
            FROM users
            WHERE firebase_uid = ?
            """,
            (firebase_uid,)
        ).fetchone()

        if user:
            conn.execute(
                """
                UPDATE users
                SET email = ?
                WHERE id = ?
                """,
                (email, user["id"])
            )
            conn.commit()

            updated_user = conn.execute(
                """
                SELECT *
                FROM users
                WHERE id = ?
                """,
                (user["id"],)
            ).fetchone()

            return dict(updated_user)

        # Link an existing local account with the same email.
        user = conn.execute(
            """
            SELECT *
            FROM users
            WHERE LOWER(email) = ?
            """,
            (email,)
        ).fetchone()

        if user:
            # Do not overwrite an account already linked to
            # a different Firebase identity.
            existing_uid = user["firebase_uid"]

            if existing_uid and existing_uid != firebase_uid:
                raise ValueError(
                    "This local account is already linked to "
                    "another Firebase account."
                )

            conn.execute(
                """
                UPDATE users
                SET firebase_uid = ?
                WHERE id = ?
                """,
                (firebase_uid, user["id"])
            )
            conn.commit()

            updated_user = conn.execute(
                """
                SELECT *
                FROM users
                WHERE id = ?
                """,
                (user["id"],)
            ).fetchone()

            return dict(updated_user)

        # Create a local profile. Firebase manages the actual password.
        placeholder_password = generate_password_hash(
            uuid.uuid4().hex + uuid.uuid4().hex
        )

        conn.execute(
            """
            INSERT INTO users
                (username, email, password, firebase_uid)
            VALUES (?, ?, ?, ?)
            """,
            (
                username,
                email,
                placeholder_password,
                firebase_uid
            )
        )
        conn.commit()

        user = conn.execute(
            """
            SELECT *
            FROM users
            WHERE firebase_uid = ?
            """,
            (firebase_uid,)
        ).fetchone()

        if not user:
            raise RuntimeError(
                "Failed to create the local Firebase user profile."
            )

        return dict(user)

    finally:
        conn.close()


# ============================================================
# 4. SECURE FIREBASE ID TOKEN VERIFICATION
# ============================================================

def verify_firebase_token(id_token):
    """
    Verify a Firebase ID token using Google's Identity Toolkit API.

    Returns:
        dict: uid, email, username, and email_verified.

    Raises:
        ValueError: If the token is invalid or the user is missing.
        RuntimeError: If configuration or Google's API is unavailable.
    """

    if not isinstance(id_token, str) or not id_token.strip():
        raise ValueError("Firebase ID token is required.")

    # Read the Firebase Web API key configured on the server.
    api_key = (getattr(Config, "FIREBASE_API_KEY", "") or "").strip()

    if not api_key:
        raise RuntimeError(
            "Firebase API key is not configured. "
            "Set FIREBASE_API_KEY in your application configuration."
        )

    url = (
        "https://identitytoolkit.googleapis.com/v1/"
        f"accounts:lookup?key={api_key}"
    )

    try:
        response = requests.post(
            url,
            json={"idToken": id_token.strip()},
            timeout=10
        )

    except requests.RequestException as exc:
        raise RuntimeError(
            "Unable to contact Google's Firebase verification API."
        ) from exc

    # Reject invalid tokens and API errors.
    if not response.ok:
        try:
            result = response.json()
            error_info = result.get("error", {})
            error_code = error_info.get("message", "")

        except (ValueError, AttributeError):
            error_code = ""

        if error_code == "INVALID_ID_TOKEN":
            raise ValueError("Invalid Firebase ID token.")

        if error_code == "USER_NOT_FOUND":
            raise ValueError("Firebase user was not found.")

        if error_code == "API_KEY_INVALID":
            raise RuntimeError(
                "Firebase API key is invalid. "
                "Check FIREBASE_API_KEY in your configuration."
            )

        raise RuntimeError(
            "Firebase verification failed. "
            f"Google API response: {error_code or response.status_code}"
        )

    try:
        result = response.json()
    except ValueError as exc:
        raise RuntimeError(
            "Google returned an invalid JSON response."
        ) from exc

    users = result.get("users", [])

    if not users:
        raise ValueError("No Firebase user was found for this token.")

    firebase_user = users[0]

    uid = firebase_user.get("localId")
    email = (firebase_user.get("email") or "").strip().lower()

    if not uid or not email:
        raise ValueError(
            "Firebase returned incomplete user information."
        )

    username = (
        firebase_user.get("displayName")
        or email.split("@")[0]
        or "Researcher"
    )

    return {
        "uid": uid,
        "email": email,
        "username": username,
        "email_verified": firebase_user.get("emailVerified", False)
    }
