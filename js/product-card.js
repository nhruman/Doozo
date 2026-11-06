function createProductCard(product) {
  // ===========================================
  // Product Image URL
  // ===========================================

  let imageSrc = "";

  // Backend অথবা Supabase Image
  if (Array.isArray(product.images) && product.images.length > 0) {
    imageSrc = product.images[0];
  } else if (product.image_url) {
    imageSrc = product.image_url;
  } else if (product.image) {
    imageSrc = product.image;
  }

  // Full URL হলে সরাসরি ব্যবহার
  if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
    // Supabase URL - কোনো পরিবর্তন প্রয়োজন নেই
  } else if (imageSrc.startsWith("/")) {
    // পুরোনো Local Backend Image
    imageSrc = `https://dozo-xslw.onrender.com${imageSrc}`;
  } else if (imageSrc) {
    // পুরোনো Static Local Image
    imageSrc = `images/${product.category}/${imageSrc}`;
  }
  // Price
  const price = Number(product.price) || 0;

  const priceText = price === 0 ? "無料" : `¥${price.toLocaleString("ja-JP")}`;

  // Condition
  const conditionText = {
    new: "新品",
    good: "良好",
    used: "中古",
  };

  const condition = conditionText[product.condition] || product.condition || "";

  // Location
  const location = product.location || "";

  // Distance (পুরোনো Product-এর জন্য)
  const distance = product.distance || "";

  // Pickup
  const pickup = product.pickup || "直接受け渡し";

  // Product Details URL
  const detailURL = `product-details.html?category=${encodeURIComponent(product.category)}&id=${encodeURIComponent(product.id)}`;

  return `
        <article class="product-card">

            <div class="card-image-box">

                <a
                    href="${detailURL}"
                    class="product-image-link"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img
                        src="${imageSrc}"
                        alt="${product.title}"
                        class="product-image"
                        loading="lazy"
                    >
                </a>

                <span class="badge ${price === 0 ? "badge-free" : ""}">
                    ${priceText}
                </span>

            </div>

            <div class="card-body">

                <div class="card-info">

                    <h3 class="product-title">
                        ${product.title}
                    </h3>

                    <p class="product-meta">
                        <i class="fa-solid fa-location-dot"></i>
                        ${location}
                        ${distance ? `・${distance}` : ""}
                    </p>

                    <p class="product-condition">
                        ${condition}
                    </p>

                </div>

                <div class="card-footer">

                    <span class="volunteer-badge">
                        <i class="fa-solid fa-user-shield"></i>
                        ${pickup}
                    </span>

                    <a
                        href="${detailURL}"
                        class="btn-take"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        欲しい
                    </a>

                </div>

            </div>

        </article>
    `;
}
