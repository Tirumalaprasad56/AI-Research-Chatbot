
import {
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { auth } from "./firebase-config.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const authMessage = document.getElementById("authMessage");

function showMessage(message, type = "info") {
    if (!authMessage) {
        alert(message);
        return;
    }

    authMessage.textContent = message;
    authMessage.className = `alert alert-${type}`;
    authMessage.hidden = false;
}

function setLoading(loading) {
    if (!loginBtn) return;

    if (loading) {
        loginBtn.dataset.originalText = loginBtn.innerHTML;
        loginBtn.disabled = true;
        loginBtn.innerHTML =
            '<span class="spinner-border spinner-border-sm"></span> Signing In...';
    } else {
        loginBtn.disabled = false;

        if (loginBtn.dataset.originalText) {
            loginBtn.innerHTML = loginBtn.dataset.originalText;
            delete loginBtn.dataset.originalText;
        }
    }
}

function friendlyError(error) {
    const messages = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/too-many-requests":
            "Too many attempts. Please try again later.",
        "auth/network-request-failed":
            "Check your internet connection.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/operation-not-allowed":
            "Email/password authentication is not enabled in Firebase."
    };

    return messages[error.code] || "Login failed. Please try again.";
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (authMessage) {
            authMessage.hidden = true;
        }

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;

        if (!email || !password) {
            showMessage(
                "Enter your email and password.",
                "danger"
            );
            return;
        }

        setLoading(true);

        try {
            const credential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = credential.user;

            await user.reload();

            if (!user.emailVerified) {
                try {
                    await sendEmailVerification(user);

                    showMessage(
                        "Your email is not verified. A verification email " +
                        "has been sent. Verify your email, then log in again.",
                        "warning"
                    );
                } catch (emailError) {
                    console.error(
                        "Verification email error:",
                        emailError
                    );

                    showMessage(
                        emailError.code === "auth/too-many-requests"
                            ? "Too many email requests. Please try again later."
                            : "Your email is not verified. Check your inbox " +
                              "and try again later.",
                        "warning"
                    );
                }

                await signOut(auth);
                return;
            }

            const idToken = await user.getIdToken(true);

            const response = await fetch("/auth/firebase-login", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ idToken })
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "The server could not create your session."
                );
            }

            const redirectUrl = result.redirect_url || "/dashboard";

            if (
                !redirectUrl.startsWith("/") ||
                redirectUrl.startsWith("//")
            ) {
                throw new Error("Invalid redirect URL.");
            }

            window.location.assign(redirectUrl);

        } catch (error) {
            console.error("Login error:", error);

            if (auth.currentUser) {
                await signOut(auth).catch(() => {});
            }

            showMessage(
                error.message && !error.code
                    ? error.message
                    : friendlyError(error),
                "danger"
            );

        } finally {
            setLoading(false);
        }
    });
}
