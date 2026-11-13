
const filterContainer = document.getElementById("filter-container");

// ===========================================
// Filter HTML
// ===========================================

filterContainer.innerHTML = `
    <div class="filter-dropdown">

        <button class="filter-button" type="button">
            <i class="fa-solid fa-filter"></i>
            Filter
            <i class="fa-solid fa-chevron-down"></i>
        </button>

        <div class="filter-menu">

            <p class="filter-title">Condition</p>

            <button data-condition="all">All</button>
            <button data-condition="free">Free</button>
            <button data-condition="used">Used</button>
            <button data-condition="new">New</button>

            <hr>

            <p class="filter-title">Price Range</p>

            <button data-price="all">All Prices</button>
            <button data-price="0-1000">¥0 ～ ¥1,000</button>
            <button data-price="1000-5000">¥1,000 ～ ¥5,000</button>
            <button data-price="5000-10000">¥5,000 ～ ¥10,000</button>
            <button data-price="10000-20000">¥10,000 ～ ¥20,000</button>

            <hr>

            <button class="filter-reset" type="button">
                Reset Filters
            </button>

        </div>
    </div>
`;


// ===========================================
// Mottainai Connect - Product Filter
// ===========================================

const filterDropdown = filterContainer.querySelector(".filter-dropdown");
const filterButton = filterContainer.querySelector(".filter-button");

// Selected Filters
let selectedCondition = "all";
let selectedPrice = "all";


// ===========================================
// Open / Close Dropdown
// ===========================================

filterButton.addEventListener("click", function(e) {

    e.stopPropagation();

    filterDropdown.classList.toggle("active");

});


// ===========================================
// Apply Filters
// ===========================================


function applyFilters() {

    const products = document.querySelectorAll(".product-card");

    products.forEach(product => {

        const condition = product.dataset.condition;
        const price = Number(product.dataset.price);

        // ===================================
        // Condition Filter
        // ===================================

        let conditionMatch = true;

        switch (selectedCondition) {

            case "free":
                conditionMatch = price === 0;
                break;

            case "used":
                conditionMatch = condition === "used";
                break;

            case "new":
                conditionMatch = condition === "new";
                break;

            default:
                conditionMatch = true;
        }


        // ===================================
        // Price Filter
        // ===================================

        let priceMatch = true;

        if (selectedPrice !== "all") {

            const [min, max] = selectedPrice.split("-").map(Number);

            priceMatch = price >= min && price <= max;
        }


        // ===================================
        // Combine Both Filters
        // ===================================

        if (conditionMatch && priceMatch) {

            product.style.display = "";

        } else {

            product.style.display = "none";

        }

    });

}



// ===========================================
// Condition Selection
// ===========================================

filterDropdown.querySelectorAll("[data-condition]")
.forEach(button => {

    button.addEventListener("click", function() {

        selectedCondition = this.dataset.condition;

        applyFilters();

    });

});


// ===========================================
// Price Selection
// ===========================================

filterDropdown.querySelectorAll("[data-price]")
.forEach(button => {

    button.addEventListener("click", function() {

        selectedPrice = this.dataset.price;

        applyFilters();

    });

});


// ===========================================
// Reset Filters
// ===========================================

filterDropdown.querySelector(".filter-reset")
.addEventListener("click", function() {

    selectedCondition = "all";
    selectedPrice = "all";

    applyFilters();

});


// ===========================================
// Close Dropdown Outside Click
// ===========================================

document.addEventListener("click", function(e) {

    if (!filterDropdown.contains(e.target)) {

        filterDropdown.classList.remove("active");

    }

});
