// ======================================
// SHOW / HIDE PASSWORD
// ======================================

const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

if (togglePassword && password) {

    togglePassword.onclick = () => {

        if (password.type === "password") {

            password.type = "text";

            togglePassword.innerHTML =
                '<i class="bi bi-eye-slash"></i>';

        } else {

            password.type = "password";

            togglePassword.innerHTML =
                '<i class="bi bi-eye"></i>';

        }

    };

}

// ======================================
// SHOW / HIDE CONFIRM PASSWORD
// ======================================

const confirmPassword =
    document.getElementById("confirmPassword");

const toggleConfirmPassword =
    document.getElementById("toggleConfirmPassword");

if (toggleConfirmPassword && confirmPassword) {

    toggleConfirmPassword.onclick = () => {

        if (confirmPassword.type === "password") {

            confirmPassword.type = "text";

            toggleConfirmPassword.innerHTML =
                '<i class="bi bi-eye-slash"></i>';

        } else {

            confirmPassword.type = "password";

            toggleConfirmPassword.innerHTML =
                '<i class="bi bi-eye"></i>';

        }

    };

}

// ======================================
// PASSWORD STRENGTH
// ======================================

const strength =
    document.getElementById("passwordStrength");

if (password && strength) {

    password.addEventListener("keyup", () => {

        let value = password.value;

        let score = 0;

        if (value.length >= 8) score++;

        if (/[A-Z]/.test(value)) score++;

        if (/[a-z]/.test(value)) score++;

        if (/[0-9]/.test(value)) score++;

        if (/[^A-Za-z0-9]/.test(value)) score++;

        if (score <= 2) {

            strength.innerHTML =
                "Weak Password";

            strength.style.color = "#dc2626";

        }

        else if (score <= 4) {

            strength.innerHTML =
                "Medium Password";

            strength.style.color = "#f59e0b";

        }

        else {

            strength.innerHTML =
                "Strong Password";

            strength.style.color = "#16a34a";

        }

    });

}

// ======================================
// PASSWORD MATCH
// ======================================

if (confirmPassword && password) {

    confirmPassword.addEventListener("keyup", () => {

        if (confirmPassword.value === "")
            return;

        if (password.value === confirmPassword.value) {

            confirmPassword.style.border =
                "2px solid #22c55e";

        }

        else {

            confirmPassword.style.border =
                "2px solid #ef4444";

        }

    });

}

// ======================================
// LOGIN BUTTON LOADING
// ======================================

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

    loginBtn.addEventListener("click", function () {

        console.log("Login button clicked");

        setTimeout(() => {

            loginBtn.disabled = true;

            loginBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm"></span>
                Signing In...
            `;

        }, 100);

    });

}

// ======================================
// REGISTER FORM
// ======================================

const registerForm = document.getElementById("registerForm");
const registerBtn = document.getElementById("registerBtn");

if (registerForm) {

    registerForm.addEventListener("submit", function(e) {

        if (
            confirmPassword &&
            password &&
            password.value !== confirmPassword.value
        ) {

            e.preventDefault();

            alert("Passwords do not match.");

            return;
        }

        registerBtn.disabled = true;

        registerBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm"></span>
            Creating Account...
        `;
    });

}