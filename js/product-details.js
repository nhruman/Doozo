
/* =====================================================
   Mottainai Connect
   Product Details + Image Gallery
===================================================== */

// =====================================================
// 1. API SETTINGS
// =====================================================

const API_BASE = "https://dozo-xslw.onrender.com";
const API_URL = `${API_BASE}/api/products`;

const params = new URLSearchParams(window.location.search);

const selectedCategory = params.get("category");
const selectedId = params.get("id");
const source = params.get("source");

const detailsContainer = document.getElementById("product-details");

let currentImages = [];
let currentImageIndex = 0;


// =====================================================
// 2. ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

}


// =====================================================
// 3. GET IMAGE URL
// =====================================================

function getImageURL(image) {

    if (!image) {
        return "";
    }

    // Already full URL
    if (/^https?:\/\//i.test(image)) {
        return image;
    }

    // Backend uploaded images
    if (image.startsWith("/uploads/")) {
        return `${API_BASE}${image}`;
    }

    // Static images
    return image;

}


// =====================================================
// 4. GET ALL PRODUCT IMAGES
// =====================================================

function getProductImages(product) {

    let images = [];

    // Multiple uploaded images
    if (Array.isArray(product.images) && product.images.length > 0) {

        images = product.images;

    }

    // Single backend image
    else if (product.image_url) {

        images = [product.image_url];

    }

    // Static product image
    else if (product.image) {

        const category = product.category || selectedCategory;

        if (category) {

            images = [
                `images/${encodeURIComponent(category)}/${encodeURIComponent(product.image)}`
            ];

        }

    }

    return [...new Set(images.filter(Boolean).map(getImageURL))];

}



// =====================================================
// 5. GET SELECTED PRODUCT
// =====================================================

async function getSelectedProduct() {

    // -----------------------------------------------
    // 1. First: Search SQLite Backend
    // -----------------------------------------------

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.products)) {
            throw new Error("Invalid product data.");
        }

        const backendProduct = result.products.find(
            item => String(item.id) === String(selectedId)
        );

        // Backend product found
        if (backendProduct) {

            console.log("Product Source: SQLite Backend");

            return backendProduct;

        }

    } catch (error) {

        console.warn("Backend Product Search:", error);

        // Profile products require backend
        if (source === "profile") {
            throw error;
        }

    }


    // -----------------------------------------------
    // 2. Second: Search Static JavaScript Products
    // -----------------------------------------------

    const allProducts = {

        electronics: typeof products !== "undefined" ? products : [],

        clothing: typeof clothingProducts !== "undefined"
            ? clothingProducts : [],

        books: typeof booksProducts !== "undefined"
            ? booksProducts : [],

        household: typeof householdProducts !== "undefined"
            ? householdProducts : [],

        toy: typeof toysProducts !== "undefined"
            ? toysProducts : [],

        furniture: typeof furnitureProducts !== "undefined"
            ? furnitureProducts : [],

        bedding: typeof beddingProducts !== "undefined"
            ? beddingProducts : [],

        sports: typeof sportsProducts !== "undefined"
            ? sportsProducts : [],

        hobby: typeof hobbyProducts !== "undefined"
            ? hobbyProducts : [],

        indoor: typeof indoorProducts !== "undefined"
            ? indoorProducts : []

    };


    const productList = allProducts[selectedCategory] || [];

    const staticProduct = productList.find(
        item => String(item.id) === String(selectedId)
    );

    if (staticProduct) {

        console.log("Product Source: Static JavaScript");

        return staticProduct;

    }

    return null;

}



// =====================================================
// 6. DISPLAY PRODUCT DETAILS
// =====================================================

function displayProduct(product) {

    const price = Number(product.price);

    const priceText = price === 0
        ? "無料"
        : Number.isFinite(price)
            ? `¥${price.toLocaleString("ja-JP")}`
            : "価格未設定";


    // Get all images
    currentImages = getProductImages(product);

    currentImageIndex = 0;


    detailsContainer.innerHTML = `

        <div class="product-details-layout">

            <!-- ===================================
                 PRODUCT IMAGE GALLERY
            ==================================== -->

            <div class="details-image-section">

                <div class="product-gallery">

                    <!-- Left Thumbnails -->

                    <div
                        class="gallery-thumbnails"
                        id="gallery-thumbnails">
                    </div>


                    <!-- Main Image -->

                    <div class="gallery-main">

                        <div
                            class="gallery-image-wrapper"
                            id="gallery-image-wrapper">

                            <img
                                id="gallery-main-image"
                                class="details-product-image"
                                alt="${escapeHTML(product.title)}"
                            >

                        </div>

                        <p class="gallery-hint">
                            画像をクリックすると拡大表示できます
                        </p>

                    </div>

                </div>

            </div>


            <!-- ===================================
                 PRODUCT INFORMATION
            ==================================== -->

            <div class="details-info-section">

                <h1 class="details-title">
                    ${escapeHTML(product.title)}
                </h1>


                <p class="details-price">
                    ${priceText}
                </p>


                <div class="details-meta">

                    <p>
                        <strong>状態：</strong>
                        ${escapeHTML(product.condition)}
                    </p>


                    <p>
                        <strong>場所：</strong>
                        ${escapeHTML(product.location)}
                    </p>


                    ${product.distance ? `

                        <p>
                            <strong>距離：</strong>
                            ${escapeHTML(product.distance)}
                        </p>

                    ` : ""}


                    ${product.pickup ? `

                        <p>
                            <strong>受け取り：</strong>
                            ${escapeHTML(product.pickup)}
                        </p>

                    ` : ""}

                </div>


                <!-- Product Description -->

                <div class="details-description">

                    <h2>商品説明</h2>

                    <p>
                        ${escapeHTML(product.description ?? product.details)}
                    </p>

                </div>


                <!-- Contact Seller -->

                <button
                    class="contact-seller-btn"
                    id="contact-seller">

                    出品者に連絡する

                </button>

            </div>

        </div>

    `;


    // Create Gallery
    createGallery();


    // Contact Seller
    document.getElementById("contact-seller")
        .addEventListener("click", () => {

            if (!window.MottainaiStore?.getSession()) {

                window.location.href = "login.html";

                return;

            }

            alert("メッセージ機能は準備中です。");

        });

}


// =====================================================
// 7. CREATE IMAGE GALLERY
// =====================================================

function createGallery() {

    const thumbnails = document.getElementById("gallery-thumbnails");

    const mainImage = document.getElementById("gallery-main-image");

    if (!thumbnails || !mainImage) {
        return;
    }


    // No Images
    if (currentImages.length === 0) {

        mainImage.style.display = "none";

        thumbnails.innerHTML = `
            <p>画像がありません。</p>
        `;

        return;

    }


    // Main Image
    mainImage.src = currentImages[currentImageIndex];

    mainImage.addEventListener("click", openFullscreen);


    // Thumbnail List
    thumbnails.innerHTML = "";


    currentImages.forEach((image, index) => {

        const thumbnail = document.createElement("button");

        thumbnail.type = "button";

        thumbnail.className = "gallery-thumbnail";


        if (index === currentImageIndex) {

            thumbnail.classList.add("active");

        }


        const thumbnailImage = document.createElement("img");

        thumbnailImage.src = image;

        thumbnailImage.alt = `商品画像 ${index + 1}`;


        thumbnail.appendChild(thumbnailImage);


        // Click Thumbnail
        thumbnail.addEventListener("click", () => {

            changeMainImage(index);

        });


        thumbnails.appendChild(thumbnail);

    });

}


// =====================================================
// 8. CHANGE MAIN IMAGE
// =====================================================

function changeMainImage(index) {

    if (index < 0 || index >= currentImages.length) {
        return;
    }


    currentImageIndex = index;


    const mainImage = document.getElementById("gallery-main-image");

    if (!mainImage) {
        return;
    }


    // Change Main Image
    mainImage.src = currentImages[index];


    // Update Active Thumbnail
    document.querySelectorAll(".gallery-thumbnail")
        .forEach((thumbnail, thumbnailIndex) => {

            thumbnail.classList.toggle(
                "active",
                thumbnailIndex === index
            );

        });

}


// =====================================================
// 9. FULLSCREEN IMAGE VIEWER
// =====================================================

function openFullscreen() {

    if (currentImages.length === 0) {
        return;
    }


    // Prevent Duplicate Lightbox
    if (document.getElementById("image-lightbox")) {
        return;
    }


    const lightbox = document.createElement("div");

    lightbox.id = "image-lightbox";

    lightbox.className = "image-lightbox";


    lightbox.innerHTML = `

        <!-- Close Button -->

        <button
            class="lightbox-close"
            id="lightbox-close"
            aria-label="Close">

            &times;

        </button>


        <!-- Previous Button -->

        <button
            class="lightbox-prev"
            id="lightbox-prev"
            aria-label="Previous image">

            &#10094;

        </button>


        <!-- Image -->

        <div class="lightbox-content">

            <img
                id="lightbox-image"
                alt="商品画像">

            <p id="lightbox-counter"></p>

        </div>


        <!-- Next Button -->

        <button
            class="lightbox-next"
            id="lightbox-next"
            aria-label="Next image">

            &#10095;

        </button>

    `;


    document.body.appendChild(lightbox);


    // Update Fullscreen Image
    function updateLightbox() {

        document.getElementById("lightbox-image").src =
            currentImages[currentImageIndex];


        document.getElementById("lightbox-counter").textContent =
            `${currentImageIndex + 1} / ${currentImages.length}`;


        document.getElementById("lightbox-prev").disabled =
            currentImageIndex === 0;


        document.getElementById("lightbox-next").disabled =
            currentImageIndex === currentImages.length - 1;

    }


    // Close Viewer
    function closeLightbox() {

        lightbox.remove();

        document.removeEventListener(
            "keydown",
            handleKeyboard
        );

    }


    // Keyboard Navigation
    function handleKeyboard(event) {

        if (event.key === "Escape") {

            closeLightbox();

        }


        if (event.key === "ArrowRight") {

            if (currentImageIndex < currentImages.length - 1) {

                changeMainImage(currentImageIndex + 1);

                updateLightbox();

            }

        }


        if (event.key === "ArrowLeft") {

            if (currentImageIndex > 0) {

                changeMainImage(currentImageIndex - 1);

                updateLightbox();

            }

        }

    }


    // Close Button
    document.getElementById("lightbox-close")
        .addEventListener("click", closeLightbox);


    // Previous Button
    document.getElementById("lightbox-prev")
        .addEventListener("click", () => {

            if (currentImageIndex > 0) {

                changeMainImage(currentImageIndex - 1);

                updateLightbox();

            }

        });


    // Next Button
    document.getElementById("lightbox-next")
        .addEventListener("click", () => {

            if (currentImageIndex < currentImages.length - 1) {

                changeMainImage(currentImageIndex + 1);

                updateLightbox();

            }

        });


    // Click Outside to Close
    lightbox.addEventListener("click", event => {

        if (event.target === lightbox) {

            closeLightbox();

        }

    });


    // Keyboard Event
    document.addEventListener("keydown", handleKeyboard);


    updateLightbox();

}


// =====================================================
// 10. PRODUCT NOT FOUND
// =====================================================

function showProductNotFound() {

    detailsContainer.innerHTML = `

        <div class="product-not-found">

            <h2>商品が見つかりませんでした。</h2>

            <a href="index.html">
                ホームに戻る
            </a>

        </div>

    `;

}


// =====================================================
// 11. SERVER ERROR
// =====================================================

function showServerError() {

    detailsContainer.innerHTML = `

        <div class="product-not-found">

            <h2>商品を読み込めませんでした。</h2>

            <p>
                サーバーが起動しているか確認してください。
            </p>

            <a href="index.html">
                ホームに戻る
            </a>

        </div>

    `;

}


// =====================================================
// 12. INITIALIZE PRODUCT DETAILS
// =====================================================

async function initProductDetails() {

    if (!detailsContainer) {
        return;
    }


    try {

        const product = await getSelectedProduct();


        if (product) {

            displayProduct(product);

        } else {

            showProductNotFound();

        }

    } catch (error) {

        console.error("Product Details Error:", error);

        showServerError();

    }

}


// =====================================================
// 13. START APPLICATION
// =====================================================

initProductDetails();
