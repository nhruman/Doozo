
// =====================================
// Firebase Authentication
// =====================================

import { auth } from "../auth/firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


// =====================================
// Backend API
// =====================================

const API_BASE = "https://dozo-xslw.onrender.com";
const API_URL = `${API_BASE}/api/products`;


// =====================================
// Get Product ID from URL
// =====================================

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");


// =====================================
// HTML Elements
// =====================================

const editForm = document.getElementById("edit-form");

const loadingMessage = document.getElementById("edit-loading");
const formMessage = document.getElementById("form-message");

const titleInput = document.getElementById("title");
const categoryInput = document.getElementById("category");
const conditionInput = document.getElementById("condition");
const priceInput = document.getElementById("price");
const locationInput = document.getElementById("location");
const descriptionInput = document.getElementById("description");

const photosInput = document.getElementById("photos");
const photoPreview = document.getElementById("photo-preview");

const descriptionCount = document.getElementById("description-count");
const submitButton = document.getElementById("submit-button");


// =====================================
// Current User and Product
// =====================================

let currentUser = null;
let currentProduct = null;


// =====================================
// Authentication Check
// =====================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = user;

    if (!productId || !/^\d+$/.test(productId)) {
        showError("商品IDが正しくありません。");
        return;
    }

    await loadProduct(user.uid);
});


// =====================================
// Load Product Information
// =====================================

async function loadProduct(uid) {

    loadingMessage.textContent = "商品情報を読み込んでいます...";

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

        // Find Selected Product
        currentProduct = (result.products || []).find(
            product => String(product.id) === String(productId)
        );

        if (!currentProduct) {
            throw new Error(
                "商品が見つからないか、編集する権限がありません。"
            );
        }

        // Fill Existing Product Information
        fillForm(currentProduct);

        // Show Form
        loadingMessage.hidden = true;
        editForm.hidden = false;

    } catch (error) {

        console.error("Load Product Error:", error);

        showError(
            error.message || "商品情報の読み込みに失敗しました。"
        );
    }
}


// =====================================
// Fill Existing Product Information
// =====================================

function fillForm(product) {

    titleInput.value = product.title || "";

    categoryInput.value = product.category || "";

    conditionInput.value = product.condition || "";

    priceInput.value = Number(product.price) || 0;

    locationInput.value = product.location || "";

    descriptionInput.value = product.description || "";

    // Update Description Count
    updateDescriptionCount();

    // Display Existing Images
    const images = product.images?.length
        ? product.images
        : product.image_url
            ? [product.image_url]
            : [];

    displayImages(images, "現在の商品写真");

}


// =====================================
// Display Product Images
// =====================================

function displayImages(images, labelText) {

    photoPreview.replaceChildren();

    if (!images || images.length === 0) {

        const message = document.createElement("p");

        message.textContent = "登録されている写真はありません。";

        photoPreview.appendChild(message);

        return;
    }

    const label = document.createElement("p");

    label.textContent = labelText;

    label.style.fontWeight = "600";
    label.style.marginBottom = "10px";

    photoPreview.appendChild(label);


    const imageGrid = document.createElement("div");

    imageGrid.style.display = "flex";
    imageGrid.style.flexWrap = "wrap";
    imageGrid.style.gap = "12px";


    images.forEach(imageUrl => {

        const image = document.createElement("img");

        image.src = imageUrl.startsWith("http")
            ? imageUrl
            : `${API_BASE}${imageUrl}`;

        image.alt = "商品写真";

        image.style.width = "110px";
        image.style.height = "110px";
        image.style.objectFit = "cover";
        image.style.borderRadius = "10px";
        image.style.border = "1px solid #ddd";

        imageGrid.appendChild(image);

    });

    photoPreview.appendChild(imageGrid);
}


// =====================================
// Preview Newly Selected Images
// =====================================

photosInput.addEventListener("change", () => {

    const files = Array.from(photosInput.files || []);

    if (files.length === 0) {

        const images = currentProduct?.images?.length
            ? currentProduct.images
            : currentProduct?.image_url
                ? [currentProduct.image_url]
                : [];

        displayImages(images, "現在の商品写真");

        return;
    }

    if (files.length > 5) {

        alert("写真は最大5枚まで選択できます。");

        photosInput.value = "";
        return;
    }

    const invalidFile = files.find(file =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
    );

    if (invalidFile) {

        alert("JPEG / PNG / WebP形式で、1枚5MB以内の写真を選択してください。");

        photosInput.value = "";
        return;
    }

    const previews = files.map(file =>
        URL.createObjectURL(file)
    );

    displayImages(previews, "新しい写真（保存時に入れ替わります）");

});


// =====================================
// Description Character Count
// =====================================

descriptionInput.addEventListener("input", updateDescriptionCount);

function updateDescriptionCount() {

    descriptionCount.textContent =
        descriptionInput.value.length;
}


// =====================================
// Price Hint
// =====================================

priceInput.addEventListener("input", () => {

    const price = Number(priceInput.value);

    const priceHint = document.getElementById("price-hint");

    if (priceHint) {

        priceHint.textContent =
            price === 0
                ? "¥0 は「無料」として出品されます。"
                : `販売価格：¥${price.toLocaleString("ja-JP")}`;
    }
});


// =====================================
// Update Product
// =====================================

editForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentUser || !currentProduct) {
        return;
    }

    // Browser Validation
    if (!editForm.checkValidity()) {
        editForm.reportValidity();
        return;
    }

    // Validate Selected Images
    const files = Array.from(photosInput.files || []);

    if (files.length > 5) {

        alert("写真は最大5枚まで選択できます。");
        return;
    }

    const invalidFile = files.find(file =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
    );

    if (invalidFile) {

        alert("JPEG / PNG / WebP形式で、1枚5MB以内の写真を選択してください。");
        return;
    }

    // Validate Price
    const price = Number(priceInput.value);

    if (
        !Number.isSafeInteger(price) ||
        price < 0 ||
        price > 1000000
    ) {

        alert("価格は0円から1,000,000円までの整数で入力してください。");
        return;
    }


    // Create FormData
    const formData = new FormData();

    formData.append("userId", currentUser.uid);

    formData.append("title", titleInput.value.trim());

    formData.append("category", categoryInput.value);

    formData.append("condition", conditionInput.value);

    formData.append("price", String(price));

    formData.append("location", locationInput.value.trim());

    formData.append("description", descriptionInput.value.trim());


    // Add New Images Only When Selected
    files.forEach(file => {
        formData.append("photos", file);
    });


    // Disable Submit Button
    submitButton.disabled = true;

    submitButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...';

    formMessage.textContent = "商品情報を更新しています...";


    try {

        const response = await fetch(
            `${API_URL}/${encodeURIComponent(productId)}`,
            {
                method: "PUT",
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {

            throw new Error(
                result.message || "商品情報の更新に失敗しました。"
            );
        }

        alert("商品情報を更新しました！");

        // Return to Profile
        window.location.href = "profile.html";

    } catch (error) {

        console.error("Update Product Error:", error);

        formMessage.textContent =
            error.message || "商品情報の更新に失敗しました。";

        submitButton.disabled = false;

        submitButton.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> 変更を保存する';

    }

});


// =====================================
// Show Error Message
// =====================================

function showError(message) {

    loadingMessage.textContent = message;

    loadingMessage.style.color = "#dc2626";

    editForm.hidden = true;
}
