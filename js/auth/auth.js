import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


// HTML Elements
const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const message = document.getElementById("login-message");


// Login Function
loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    message.textContent = "";
    message.style.color = "red";

    loginButton.disabled = true;

    try {

        // Firebase Login
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        console.log("Login Successful:", user.email);

        message.style.color = "green";
        message.textContent = "ログインしました！";

        /// Login সফল হলে নতুন Dashboard-এ যাবে
window.location.href = "../profile/dashboard.html";

    } catch (error) {

        console.error("Login Error:", error.code);

        switch (error.code) {

            case "auth/invalid-credential":
            case "auth/wrong-password":
            case "auth/user-not-found":
                message.textContent =
                    "メールアドレスまたはパスワードが正しくありません。";
                break;

            case "auth/invalid-email":
                message.textContent =
                    "正しいメールアドレスを入力してください。";
                break;

            case "auth/too-many-requests":
                message.textContent =
                    "しばらく時間をおいてからお試しください。";
                break;

            default:
                message.textContent =
                    "ログインに失敗しました。もう一度お試しください。";
        }

    } finally {

        loginButton.disabled = false;

    }

});