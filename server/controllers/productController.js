
const db = require("../database/database");
const fs = require("fs");

// ======================================================
// 1. Delete Uploaded Files if Saving Fails
// ======================================================

function removeUploadedFiles(files) {
    files.forEach(file => {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
}


// ======================================================
// 2. Upload Single Product Image
// ======================================================

const uploadProductImage = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a product image."
            });
        }

        const imageUrl =
            `/uploads/products/${req.file.filename}`;

        return res.status(201).json({
            success: true,
            message: "Product image uploaded successfully!",
            image: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                url: imageUrl
            }
        });

    } catch (error) {
        console.error("Upload Error:", error);

        return res.status(500).json({
            success: false,
            message: "Image upload failed."
        });
    }
};


// ======================================================
// 3. Create New Product
// ======================================================

const createProduct = (req, res) => {

    const files = req.files || [];

    try {
        const {
            userId,
            title,
            category,
            condition,
            price,
            location,
            description
        } = req.body;


        // Validate Required Fields
        if (
            !userId ||
            !title ||
            !category ||
            !condition ||
            price === undefined ||
            !location ||
            !description
        ) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields."
            });
        }


        // Validate Title
        if (
            typeof title !== "string" ||
            title.trim().length === 0 ||
            title.trim().length > 90
        ) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Product name must be 1 to 90 characters."
            });
        }


        // Allowed Categories
        const allowedCategories = [
            "electronics",
            "clothing",
            "books",
            "household",
            "toy",
            "furniture",
            "bedding",
            "sports",
            "hobby",
            "indoor"
        ];

        if (!allowedCategories.includes(category)) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Invalid product category."
            });
        }


        // Allowed Conditions
        const allowedConditions = [
            "new",
            "good",
            "used"
        ];

        if (!allowedConditions.includes(condition)) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Invalid product condition."
            });
        }


        // Validate Price
        const productPrice = Number(price);

        if (
            !Number.isSafeInteger(productPrice) ||
            productPrice < 0 ||
            productPrice > 1000000
        ) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Invalid product price."
            });
        }


        // Validate Location and Description
        if (
            typeof location !== "string" ||
            typeof description !== "string" ||
            location.trim().length === 0 ||
            location.trim().length > 100 ||
            description.trim().length < 15 ||
            description.trim().length > 1500
        ) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Please check location and description."
            });
        }


        // Validate Images
        if (files.length < 1 || files.length > 5) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Please upload 1 to 5 product images."
            });
        }


        // Prepare Image URLs
        const imageUrls = files.map(file =>
            `/uploads/products/${file.filename}`
        );


        // Start Database Transaction
        db.exec("BEGIN");

        try {

            // Insert Product Information
            const productResult = db.prepare(`
                INSERT INTO products (
                    user_id,
                    title,
                    description,
                    price,
                    category,
                    condition,
                    location,
                    image_url
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                title.trim(),
                description.trim(),
                productPrice,
                category,
                condition,
                location.trim(),
                imageUrls[0]
            );


            // Get New Product ID
            const productId = Number(
                productResult.lastInsertRowid
            );


            // Insert All Product Images
            const imageStatement = db.prepare(`
                INSERT INTO product_images (
                    product_id,
                    image_url
                )
                VALUES (?, ?)
            `);

            imageUrls.forEach(url => {
                imageStatement.run(productId, url);
            });


            // Commit Transaction
            db.exec("COMMIT");


            // Success Response
            return res.status(201).json({
                success: true,
                message: "Product uploaded successfully!",

                product: {
                    id: productId,
                    userId,
                    title: title.trim(),
                    price: productPrice,
                    category,
                    condition,
                    location: location.trim(),
                    description: description.trim(),
                    status: "active",
                    images: imageUrls
                }
            });

        } catch (databaseError) {

            // Rollback if Database Error
            db.exec("ROLLBACK");

            throw databaseError;
        }

    } catch (error) {

        console.error("Product Save Error:", error);

        removeUploadedFiles(files);

        return res.status(500).json({
            success: false,
            message: "Could not save product."
        });
    }
};


// ======================================================
// 4. Get All Products
// ======================================================

const getProducts = (req, res) => {

    try {

        const products = db.prepare(`
            SELECT *
            FROM products
            ORDER BY id DESC
        `).all();


        const imageStatement = db.prepare(`
            SELECT image_url
            FROM product_images
            WHERE product_id = ?
            ORDER BY id ASC
        `);


        const result = products.map(product => {

            const imageRows = imageStatement.all(product.id);

            const images = imageRows.length > 0
                ? imageRows.map(image => image.image_url)
                : product.image_url
                    ? [product.image_url]
                    : [];

            return {
                ...product,
                images
            };
        });


        return res.status(200).json({
            success: true,
            count: result.length,
            products: result
        });

    } catch (error) {

        console.error("Get Products Error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve products."
        });
    }
};


// ======================================================
// 5. Get Products Uploaded by a Specific User
// ======================================================

const getMyProducts = (req, res) => {

    try {

        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required."
            });
        }


        // Find User's Products
        const products = db.prepare(`
            SELECT *
            FROM products
            WHERE user_id = ?
            ORDER BY id DESC
        `).all(userId);


        // Get Product Images
        const imageStatement = db.prepare(`
            SELECT image_url
            FROM product_images
            WHERE product_id = ?
            ORDER BY id ASC
        `);


        const result = products.map(product => {

            const imageRows = imageStatement.all(product.id);

            const images = imageRows.length > 0
                ? imageRows.map(image => image.image_url)
                : product.image_url
                    ? [product.image_url]
                    : [];

            return {
                ...product,
                images
            };
        });


        return res.status(200).json({
            success: true,
            count: result.length,
            products: result
        });

    } catch (error) {

        console.error("My Products Error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve your products."
        });
    }
};


// ======================================================
// 6. Export All Controller Functions
// ======================================================
// ======================================================
// 6. Update Existing Product
// ======================================================

const updateProduct = (req, res) => {
    const files = req.files || [];

    try {
        const productId = Number(req.params.id);

        const {
            userId,
            title,
            category,
            condition,
            price,
            location,
            description
        } = req.body;

        if (!Number.isSafeInteger(productId) || productId <= 0) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        // Check Required Fields
        if (
            !userId ||
            !title ||
            !category ||
            !condition ||
            price === undefined ||
            !location ||
            !description
        ) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields."
            });
        }

        // Check Product Ownership
        const existingProduct = db.prepare(`
            SELECT *
            FROM products
            WHERE id = ? AND user_id = ?
        `).get(productId, userId);

        if (!existingProduct) {
            removeUploadedFiles(files);

            return res.status(404).json({
                success: false,
                message: "Product not found or permission denied."
            });
        }

        // Validate Product Information
        const allowedCategories = [
            "electronics", "clothing", "books", "household",
            "toy", "furniture", "bedding", "sports",
            "hobby", "indoor"
        ];

        const allowedConditions = ["new", "good", "used"];
        const productPrice = Number(price);

        if (
            typeof title !== "string" ||
            title.trim().length < 1 ||
            title.trim().length > 90 ||
            !allowedCategories.includes(category) ||
            !allowedConditions.includes(condition) ||
            !Number.isSafeInteger(productPrice) ||
            productPrice < 0 ||
            productPrice > 1000000 ||
            typeof location !== "string" ||
            location.trim().length < 1 ||
            location.trim().length > 100 ||
            typeof description !== "string" ||
            description.trim().length < 15 ||
            description.trim().length > 1500 ||
            files.length > 5
        ) {
            removeUploadedFiles(files);

            return res.status(400).json({
                success: false,
                message: "Please check the product information."
            });
        }

        // Get Old Images
        const oldImages = db.prepare(`
            SELECT image_url
            FROM product_images
            WHERE product_id = ?
        `).all(productId).map(row => row.image_url);

        const newImageUrls = files.map(file =>
            `/uploads/products/${file.filename}`
        );

        // Keep Old Images if No New Images Were Uploaded
        const finalImages = files.length > 0
            ? newImageUrls
            : oldImages.length > 0
                ? oldImages
                : existingProduct.image_url
                    ? [existingProduct.image_url]
                    : [];

        db.exec("BEGIN");

        try {
            // Update Product Information
            db.prepare(`
                UPDATE products
                SET
                    title = ?,
                    description = ?,
                    price = ?,
                    category = ?,
                    condition = ?,
                    location = ?,
                    image_url = ?
                WHERE id = ? AND user_id = ?
            `).run(
                title.trim(),
                description.trim(),
                productPrice,
                category,
                condition,
                location.trim(),
                finalImages[0] || null,
                productId,
                userId
            );

            // Replace Images Only When New Images Are Uploaded
            if (files.length > 0) {
                db.prepare(`
                    DELETE FROM product_images
                    WHERE product_id = ?
                `).run(productId);

                const insertImage = db.prepare(`
                    INSERT INTO product_images (
                        product_id,
                        image_url
                    )
                    VALUES (?, ?)
                `);

                finalImages.forEach(url => {
                    insertImage.run(productId, url);
                });
            }

            db.exec("COMMIT");

        } catch (databaseError) {
            db.exec("ROLLBACK");
            throw databaseError;
        }

        // Remove Old Images After Successful Update
        if (files.length > 0) {
            removeUnusedProductImages(oldImages);
        }

        return res.status(200).json({
            success: true,
            message: "Product updated successfully!",
            product: {
                id: productId,
                title: title.trim(),
                description: description.trim(),
                price: productPrice,
                category,
                condition,
                location: location.trim(),
                images: finalImages
            }
        });

    } catch (error) {
        console.error("Update Product Error:", error);

        removeUploadedFiles(files);

        return res.status(500).json({
            success: false,
            message: "Could not update product."
        });
    }
};


// ======================================================
// 7. Delete Product
// ======================================================

const deleteProduct = (req, res) => {
    try {
        const productId = Number(req.params.id);
        const { userId } = req.body || {};

        if (
            !Number.isSafeInteger(productId) ||
            productId <= 0 ||
            !userId
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid product information."
            });
        }

        // Check Ownership
        const product = db.prepare(`
            SELECT *
            FROM products
            WHERE id = ? AND user_id = ?
        `).get(productId, userId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or permission denied."
            });
        }

        // Collect Product Images
        const imageRows = db.prepare(`
            SELECT image_url
            FROM product_images
            WHERE product_id = ?
        `).all(productId);

        const imageUrls = [
            ...imageRows.map(row => row.image_url),
            product.image_url
        ].filter(Boolean);

        // Delete from Database
        db.exec("BEGIN");

        try {
            db.prepare(`
                DELETE FROM product_images
                WHERE product_id = ?
            `).run(productId);

            db.prepare(`
                DELETE FROM products
                WHERE id = ? AND user_id = ?
            `).run(productId, userId);

            db.exec("COMMIT");

        } catch (databaseError) {
            db.exec("ROLLBACK");
            throw databaseError;
        }

        // Delete Physical Images After Database Success
        removeUnusedProductImages(imageUrls);

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully!"
        });

    } catch (error) {
        console.error("Delete Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not delete product."
        });
    }
};


// ======================================================
// 8. Remove Images Not Used by Other Products
// ======================================================

const path = require("path");

function removeUnusedProductImages(imageUrls) {
    const uploadDirectory = path.resolve(
        __dirname,
        "../uploads/products"
    );

    const uniqueUrls = [...new Set(imageUrls)];

    uniqueUrls.forEach(imageUrl => {
        try {
            // Only allow our local product image paths
            if (
                typeof imageUrl !== "string" ||
                !imageUrl.startsWith("/uploads/products/")
            ) {
                return;
            }

            const filename = path.basename(imageUrl);

            const filePath = path.resolve(
                uploadDirectory,
                filename
            );

            // Prevent paths outside uploads/products
            if (!filePath.startsWith(uploadDirectory + path.sep)) {
                return;
            }

            // Do not delete an image used by another product
            const productReference = db.prepare(`
                SELECT id
                FROM products
                WHERE image_url = ?
                LIMIT 1
            `).get(imageUrl);

            const imageReference = db.prepare(`
                SELECT id
                FROM product_images
                WHERE image_url = ?
                LIMIT 1
            `).get(imageUrl);

            if (!productReference && !imageReference) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

        } catch (error) {
            console.error("Image Cleanup Error:", error);
        }
    });
}
module.exports = {
    uploadProductImage,
    createProduct,
    getProducts,
    getMyProducts,
    updateProduct,
    deleteProduct
};