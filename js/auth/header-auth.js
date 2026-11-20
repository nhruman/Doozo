// Firebase Authentication
import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


// Header Elements
const accountLink = document.getElementById("header-account-link");
const mobileAccount = document.getElementById("mobile-account-link");


// Firebase Login Status Check
onAuthStateChanged(auth, (user) => {

    if (user) {

        // User Logged In
        console.log("Header Login:", user.email);

        // Desktop Header
        if (accountLink) {

            accountLink.href = "profile/dashboard.html";

            accountLink.innerHTML = `
                <i class="fa-solid fa-user-check"></i>
                マイページ
            `;

            accountLink.removeAttribute("data-i18n");
        }

        // Mobile Header
        if (mobileAccount) {

           mobileAccount.href = "profile/dashboard.html";

            mobileAccount.textContent = "マイページ";

            mobileAccount.removeAttribute("data-i18n");
        }

    } else {

        // User Not Logged In
        console.log("Header: Guest User");

        // Desktop Header
        if (accountLink) {

            accountLink.href = "auth/login.html";

            accountLink.innerHTML = `
                <i class="fa-solid fa-user"></i>
                ログイン
            `;

            accountLink.setAttribute("data-i18n", "nav.login");
        }

        // Mobile Header
        if (mobileAccount) {

            mobileAccount.href = "auth/login.html";

            mobileAccount.textContent = "ログイン";

            mobileAccount.setAttribute("data-i18n", "nav.login");
        }

    }

    // Update Language
    // window.applyLanguage?.();

});