
// ==================================================
// Mottainai Connect - User Profile
// Firebase Authentication + SQLite Backend
// ==================================================


// --------------------------------------------------
// 1. Firebase Authentication
// --------------------------------------------------

import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


// --------------------------------------------------
// 2. Backend API
// --------------------------------------------------

const API_BASE = "https://dozo-xslw.onrender.com";
const API_URL = `${API_BASE}/api/products`;


// --------------------------------------------------
// 3. HTML Elements
// --------------------------------------------------

const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const userId = document.getElementById("user-id");

const profileContent = document.getElementById("profile-content");
const profileMessage = document.getElementById("profile-message");

const logoutButton = document.getElementById("logout-button");

const productContainer = document.getElementById("my-products");

const totalProductsElement = document.getElementById("total-products");
const totalValueElement = document.getElementById("total-value");
const soldProductsElement = document.getElementById("sold-products");
const totalSalesElement = document.getElementById("total-sales");


// --------------------------------------------------
// 4. Authentication Check
// --------------------------------------------------

onAuthStateChanged(auth, async (user) => {

    console.log("Auth State Changed:", user);

    // User is not logged in
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    // Display user information
    if (userName) {
        userName.textContent = user.displayName || "ユーザー";
    }

    if (userEmail) {
        userEmail.textContent = user.email || "";
    }

    if (userId) {
        userId.textContent = user.uid;
    }

    // Show profile content
    if (profileContent) {
        profileContent.hidden = false;
    }

    if (profileMessage) {
        profileMessage.textContent = "";
    }

    console.log("Profile Loaded Successfully!");

    // Load user products
    await loadDashboard(user.uid);

});


// --------------------------------------------------
// 5. Load User Dashboard
// --------------------------------------------------

async function loadDashboard(uid) {

    if (profileMessage) {
        profileMessage.textContent = "商品情報を読み込んでいます...";
    }

    try {

        const response = await fetch(
            `${API_URL}/my/${encodeURIComponent(uid)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "商品情報を取得できませんでした。"
            );
        }

        const products = result.products || [];


        // ------------------------------------------
        // Calculate Dashboard Statistics
        // ------------------------------------------

        const totalProducts = products.length;

        const totalValue = products.reduce((sum, product) => {

            return sum + Number(product.price || 0);

        }, 0);


        const soldProducts = products.filter(
            product => product.status === "sold"
        ).length;


        const totalSales = products.reduce((sum, product) => {

            if (product.status === "sold") {

                return sum + Number(
                    product.sold_price ?? product.price ?? 0
                );

            }

            return sum;

        }, 0);


        // ------------------------------------------
        // Update Dashboard Statistics
        // ------------------------------------------

        if (totalProductsElement) {
            totalProductsElement.textContent = totalProducts;
        }

        if (totalValueElement) {
            totalValueElement.textContent = formatPrice(totalValue);
        }

        if (soldProductsElement) {
            soldProductsElement.textContent = soldProducts;
        }

        if (totalSalesElement) {
            totalSalesElement.textContent = formatPrice(totalSales);
        }


        // ------------------------------------------
        // Display User Products
        // ------------------------------------------

        displayProducts(products, uid);


        if (profileMessage) {
            profileMessage.textContent = "";
        }

        console.log("My Products:", products);

    } catch (error) {

        console.error("Dashboard Error:", error);

        if (profileMessage) {
            profileMessage.textContent =
                error.message || "Dashboardの読み込みに失敗しました。";
        }

    }

}


// --------------------------------------------------
// 6. Display Product Cards
// --------------------------------------------------

function displayProducts(products, uid) {

    if (!productContainer) {
        console.error("my-products element not found!");
        return;
    }

    productContainer.replaceChildren();


    // No products
    if (products.length === 0) {

        const emptyMessage = document.createElement("p");

        emptyMessage.textContent =
            "まだ商品を出品していません。";

        productContainer.appendChild(emptyMessage);

        return;
    }


    // Create product cards
    products.forEach(product => {


        // ------------------------------------------
        // Product Card
        // ------------------------------------------

        const card = document.createElement("article");

        card.className = "my-product-card";


        // ------------------------------------------
        // Product Image
        // ------------------------------------------

        const image = document.createElement("img");

        const firstImage =
            product.images?.[0] || product.image_url;

        image.src = firstImage
            ? firstImage.startsWith("http")
                ? firstImage
                : `${API_BASE}${firstImage}`
            : "";

        image.alt = product.title || "商品写真";

        image.className = "my-product-image";

        image.loading = "lazy";


        // ------------------------------------------
        // Product Information
        // ------------------------------------------

        const info = document.createElement("div");

        info.className = "my-product-info";


        // Product Title
        const title = document.createElement("h3");

        title.textContent = product.title || "商品名なし";


        // Product Price
        const price = document.createElement("p");

        price.textContent = formatPrice(product.price);


        // Product Category
        const category = document.createElement("p");

        category.textContent =
            `カテゴリー：${product.category || ""}`;


        // Product Status
        const status = document.createElement("span");

        status.className =
            `product-status status-${product.status || "active"}`;


        const statusLabels = {

            active: "出品中",

            reserved: "取り置き中",

            sold: "売却・譲渡済み"

        };

        status.textContent =
            statusLabels[product.status] || "出品中";


        // Add information
        info.append(title, price, category, status);


        // ------------------------------------------
        // Product Action Buttons
        // ------------------------------------------

        const actions = document.createElement("div");

        actions.className = "product-actions";


        // ------------------------------------------
        // View Product Details Button
        // ------------------------------------------

        const viewButton = document.createElement("button");

        viewButton.type = "button";

        viewButton.className = "view-product-button";

        viewButton.textContent = "詳細を見る";


        // Open Product Details
        viewButton.addEventListener("click", () => {

            const detailsURL =
                `../product-details.html?id=${encodeURIComponent(product.id)}&category=${encodeURIComponent(product.category || "")}&source=profile`;

            window.location.href = detailsURL;

        });


        // ------------------------------------------
        // Edit Button
        // ------------------------------------------

        const editButton = document.createElement("button");

        editButton.type = "button";

        editButton.className = "edit-product-button";

        editButton.textContent = "編集";


        editButton.addEventListener("click", () => {

            window.location.href =
                `edit-item.html?id=${encodeURIComponent(product.id)}`;

        });


        // ------------------------------------------
        // Delete Button
        // ------------------------------------------

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className = "delete-product-button";

        deleteButton.textContent = "削除";


        deleteButton.addEventListener("click", async () => {

            // Confirm before deleting
            const confirmed = window.confirm(
                `「${product.title}」を削除しますか？`
            );

            if (!confirmed) {
                return;
            }

            deleteButton.disabled = true;

            deleteButton.textContent = "削除中...";


            try {

                const response = await fetch(
                    `${API_URL}/${encodeURIComponent(product.id)}`,
                    {
                        method: "DELETE",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            userId: uid
                        })
                    }
                );


                const result = await response.json();


                if (!response.ok || !result.success) {

                    throw new Error(
                        result.message || "商品の削除に失敗しました。"
                    );

                }


                alert("商品を削除しました。");


                // Refresh dashboard
                await loadDashboard(uid);


            } catch (error) {

                console.error("Delete Error:", error);

                alert(
                    error.message || "商品の削除に失敗しました。"
                );

                deleteButton.disabled = false;

                deleteButton.textContent = "削除";

            }

        });


        // ------------------------------------------
        // Add Buttons
        // ------------------------------------------

        actions.append(
            viewButton,
            editButton,
            deleteButton
        );


        // ------------------------------------------
        // Add Elements to Product Card
        // ------------------------------------------

        card.append(
            image,
            info,
            actions
        );

        productContainer.appendChild(card);

    });

}


// --------------------------------------------------
// 7. Price Format
// --------------------------------------------------

function formatPrice(value) {

    const amount = Number(value) || 0;

    return amount === 0
        ? "無料"
        : `¥${amount.toLocaleString("ja-JP")}`;

}


// --------------------------------------------------
// 8. Logout Function
// --------------------------------------------------

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        logoutButton.disabled = true;

        try {

            await signOut(auth);

            console.log("Logout Successful!");

            window.location.replace("login.html");

        } catch (error) {

            console.error("Logout Error:", error);

            if (profileMessage) {

                profileMessage.textContent =
                    "ログアウトに失敗しました。もう一度お試しください。";

            }

            logoutButton.disabled = false;

        }

    });

}
