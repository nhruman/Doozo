const express = require("express");
const router = express.Router();

const {
    uploadProductImage,
    createProduct,
    getProducts,
    getMyProducts,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const upload = require("../middleware/uploadMiddleware");

// 1. Upload Single Product Image
router.post(
    "/upload-image",
    upload.single("productImage"),
    uploadProductImage
);

// 2. Create New Product
router.post(
    "/",
    upload.array("photos", 5),
    createProduct
);

// 3. Get Products by User ID
router.get(
    "/my/:userId",
    getMyProducts
);

// 4. Get All Products
router.get(
    "/",
    getProducts
);

// 5. Update Product
router.put(
    "/:id",
    upload.array("photos", 5),
    updateProduct
);

// 6. Delete Product
router.delete(
    "/:id",
    deleteProduct
);

module.exports = router;