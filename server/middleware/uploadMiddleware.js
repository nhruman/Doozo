
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Create upload directory
const uploadDir = path.join(
    __dirname,
    "..",
    "uploads",
    "products"
);

fs.mkdirSync(uploadDir, { recursive: true });

// Storage configuration
const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {

        const uniqueName =
            crypto.randomUUID() +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

// Allowed image types
const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, PNG and WEBP images are allowed."));
    }
};

// Multer setup
const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = upload;
