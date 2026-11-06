
const productGrid = document.getElementById("products-container");

const API_URL = "https://dozo-xslw.onrender.com";

// ========================================
// 1. পুরোনো Static Product Data
// ========================================

const categoryProducts = {
    electronics: typeof products !== "undefined" ? products : [],
    clothing: typeof clothingProducts !== "undefined" ? clothingProducts : [],
    books: typeof booksProducts !== "undefined" ? booksProducts : [],
    household: typeof householdProducts !== "undefined" ? householdProducts : [],
    toy: typeof toysProducts !== "undefined" ? toysProducts : [],
    furniture: typeof furnitureProducts !== "undefined" ? furnitureProducts : [],
    bedding: typeof beddingProducts !== "undefined" ? beddingProducts : [],
    sports: typeof sportsProducts !== "undefined" ? sportsProducts : [],
    hobby: typeof hobbyProducts !== "undefined" ? hobbyProducts : [],
    indoor: typeof indoorProducts !== "undefined" ? indoorProducts : []
};

// ========================================
// 2. Backend Product আলাদা রাখা
// ========================================

let backendCategoryProducts = {
    electronics: [],
    clothing: [],
    books: [],
    household: [],
    toy: [],
    furniture: [],
    bedding: [],
    sports: [],
    hobby: [],
    indoor: []
};

// বর্তমানে Selected Category
let currentCategory = "electronics";

// ========================================
// 3. Category অনুযায়ী Product দেখানো
// ========================================

function showProducts(category) {

    if (!productGrid) {
        console.error("products-container পাওয়া যায়নি!");
        return;
    }

    // Static Product
    const staticProducts = categoryProducts[category] || [];

    // Backend Product
    const backendProducts = backendCategoryProducts[category] || [];

    // দুই ধরনের Product একসঙ্গে
    const allProducts = [
        ...staticProducts,
        ...backendProducts
    ];

    // Category Filter
    const filteredProducts = allProducts.filter(
        (product) => product.category === category
    );

    // কোনো Product না থাকলে
    if (filteredProducts.length === 0) {

        productGrid.innerHTML = `
            <p class="no-products">
                このカテゴリーには商品がありません。
            </p>
        `;

        return;
    }

    // Product Display
    productGrid.innerHTML = filteredProducts
        .map((product) => createProductCard(product))
        .join("");

}

// ========================================
// 4. Backend থেকে Product Load
// ========================================

async function loadBackendProducts() {

    try {

        console.log("Loading Backend Products...");

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.products)) {
            throw new Error("Invalid Product Data!");
        }

        // Backend Product Category অনুযায়ী ভাগ করা
        Object.keys(backendCategoryProducts).forEach((category) => {

            backendCategoryProducts[category] = data.products.filter(
                (product) => product.category === category
            );

        });

        console.log("Backend Products Loaded:", data.products);

        // বর্তমানে যে Category দেখা হচ্ছে সেটি Update
        showProducts(currentCategory);

    } catch (error) {

        console.error("Backend Product Loading Error:", error);

        // Backend Error হলেও Static Product থাকবে
        showProducts(currentCategory);

    }

}

// ========================================
// 5. আগের Selected Category
// ========================================

const savedCategory = localStorage.getItem("selectedCategory");

if (
    savedCategory &&
    Object.prototype.hasOwnProperty.call(categoryProducts, savedCategory)
) {

    currentCategory = savedCategory;

} else {

    currentCategory = "electronics";

}

// প্রথমে Static Product দেখাবে
showProducts(currentCategory);

// ========================================
// 6. Category Click
// ========================================

document.querySelectorAll(".cat-tabs a").forEach((tab) => {

    tab.addEventListener("click", function (event) {

        event.preventDefault();

        const category = this.getAttribute("href").replace("#cat-", "");

        if (!Object.prototype.hasOwnProperty.call(categoryProducts, category)) {
            return;
        }

        // Selected Category Save
        currentCategory = category;

        localStorage.setItem("selectedCategory", category);

        // Product Display
        showProducts(category);

    });

});

// ========================================
// 7. Backend Product Load শুরু
// ========================================

loadBackendProducts();
