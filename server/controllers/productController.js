
const db = require("../database/database");
const supabase = require("../config/supabase");
const crypto = require("crypto");
const path = require("path");

// ======================================================
// Supabase Storage Settings
// ======================================================

const BUCKET = "product-images";

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

// Allowed Conditions
const allowedConditions = ["new", "good", "used"];


// ======================================================
// 1. Upload Images to Supabase
// ======================================================

async function uploadImagesToSupabase(files) {

    const uploadedImages = [];

    try {
        for (const file of files) {

            // Create unique image name
            const extension = path.extname(
                file.originalname
            ).toLowerCase();

            const fileName =
                crypto.randomUUID() + extension;

            const objectPath = `products/${fileName}`;

            // Upload image to Supabase
            const { data, error } = await supabase.storage
                .from(BUCKET)
                .upload(objectPath, file.buffer, {
                    contentType: file.mimetype,
                    cacheControl: "3600",
                    upsert: false
                });

            if (error) {
                throw error;
            }

            // Get Public URL
            const { data: publicData } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(data.path);

            uploadedImages.push({
                url: publicData.publicUrl,
                path: data.path
            });
        }

        return uploadedImages;

    } catch (error) {

        // Delete partially uploaded images
        const uploadedPaths = uploadedImages.map(
            image => image.path
        );

        if (uploadedPaths.length > 0) {
            await deleteStoragePaths(uploadedPaths);
        }

        throw error;
    }
}


// ======================================================
// 2. Get Supabase Storage Path from Image URL
// ======================================================

function getSupabaseObjectPath(imageUrl) {

    if (typeof imageUrl !== "string") {
        return null;
    }

    try {
        const parsedUrl = new URL(imageUrl);

        const marker =
            `/storage/v1/object/public/${BUCKET}/`;

        const index = parsedUrl.pathname.indexOf(marker);

        if (index === -1) {
            return null;
        }

        const encodedPath = parsedUrl.pathname.slice(
            index + marker.length
        );

        return decodeURIComponent(encodedPath);

    } catch (error) {
        return null;
    }
}


// ======================================================
// 3. Delete Images from Supabase
// ======================================================

async function deleteStoragePaths(paths) {

    const uniquePaths = [...new Set(paths)];

    if (uniquePaths.length === 0) {
        return;
    }

    const { error } = await supabase.storage
        .from(BUCKET)
        .remove(uniquePaths);

    if (error) {
        console.error("Supabase Image Delete Error:", error);
    }
}


// ======================================================
// 4. Delete Old Images if They Are No Longer Used
// ======================================================

async function deleteUnusedSupabaseImages(imageUrls) {

    const pathsToDelete = [];

    for (const imageUrl of [...new Set(imageUrls)]) {

        const objectPath = getSupabaseObjectPath(imageUrl);

        // Ignore old local images and external URLs
        if (!objectPath) {
            continue;
        }

        // Check if another product still uses this image
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
            pathsToDelete.push(objectPath);
        }
    }

    await deleteStoragePaths(pathsToDelete);
}


// ======================================================
// 5. Upload Single Product Image
// ======================================================

const uploadProductImage = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a product image."
            });
        }

        const uploadedImages = await uploadImagesToSupabase([
            req.file
        ]);

        const image = uploadedImages[0];

        return res.status(201).json({
            success: true,
            message: "Product image uploaded successfully!",

            image: {
                filename: image.path,
                originalName: req.file.originalname,
                size: req.file.size,
                url: image.url
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
// 6. Create New Product
// ======================================================

const createProduct = async (req, res) => {

    const files = req.files || [];
    let uploadedImages = [];

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
            return res.status(400).json({
                success: false,
                message: "Product name must be 1 to 90 characters."
            });
        }


        // Validate Category
        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product category."
            });
        }


        // Validate Condition
        if (!allowedConditions.includes(condition)) {
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
            return res.status(400).json({
                success: false,
                message: "Please check location and description."
            });
        }


        // Validate Images
        if (files.length < 1 || files.length > 5) {
            return res.status(400).json({
                success: false,
                message: "Please upload 1 to 5 product images."
            });
        }


        // Upload Images to Supabase
        uploadedImages = await uploadImagesToSupabase(files);

        const imageUrls = uploadedImages.map(
            image => image.url
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

            // Rollback Database
            db.exec("ROLLBACK");

            throw databaseError;
        }

    } catch (error) {

        console.error("Product Save Error:", error);

        // Remove newly uploaded Supabase images
        const uploadedPaths = uploadedImages.map(
            image => image.path
        );

        await deleteStoragePaths(uploadedPaths);

        return res.status(500).json({
            success: false,
            message: "Could not save product."
        });
    }
};


// ======================================================
// 7. Get All Products
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
// 8. Get Products Uploaded by a Specific User
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
// 9. Update Existing Product
// ======================================================

const updateProduct = async (req, res) => {

    const files = req.files || [];
    let uploadedImages = [];

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


        // Validate Product ID
        if (
            !Number.isSafeInteger(productId) ||
            productId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }


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
            return res.status(404).json({
                success: false,
                message: "Product not found or permission denied."
            });
        }


        // Validate Product Information
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
            return res.status(400).json({
                success: false,
                message: "Please check the product information."
            });
        }


        // Get Old Images
        const oldImageRows = db.prepare(`
            SELECT image_url
            FROM product_images
            WHERE product_id = ?
        `).all(productId);

        const oldImages = [
            ...oldImageRows.map(row => row.image_url),
            existingProduct.image_url
        ].filter(Boolean);


        // Upload New Images if Selected
        if (files.length > 0) {

            uploadedImages = await uploadImagesToSupabase(files);
        }


        const newImageUrls = uploadedImages.map(
            image => image.url
        );


        // Keep Old Images if No New Images Were Uploaded
        const finalImages = files.length > 0
            ? newImageUrls
            : oldImageRows.length > 0
                ? oldImageRows.map(row => row.image_url)
                : existingProduct.image_url
                    ? [existingProduct.image_url]
                    : [];


        // Start Database Transaction
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


            // Commit Transaction
            db.exec("COMMIT");

        } catch (databaseError) {

            db.exec("ROLLBACK");

            throw databaseError;
        }


        // Delete Old Supabase Images After Successful Update
        if (files.length > 0) {
            await deleteUnusedSupabaseImages(oldImages);
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

        // Remove newly uploaded images if update failed
        const uploadedPaths = uploadedImages.map(
            image => image.path
        );

        await deleteStoragePaths(uploadedPaths);

        return res.status(500).json({
            success: false,
            message: "Could not update product."
        });
    }
};


// ======================================================
// 10. Delete Product
// ======================================================

const deleteProduct = async (req, res) => {

    try {

        const productId = Number(req.params.id);

        const { userId } = req.body || {};


        // Validate Product Information
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


        // Delete Supabase Images After Database Success
        await deleteUnusedSupabaseImages(imageUrls);


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
// 11. Export All Controller Functions
// ======================================================

module.exports = {

    uploadProductImage,
    createProduct,
    getProducts,
    getMyProducts,
    updateProduct,
    deleteProduct

};
