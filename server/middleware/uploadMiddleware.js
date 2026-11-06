
const multer = require("multer");

// Use memory storage instead of local disk storage
const storage = multer.memoryStorage();

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
        cb(
            new Error("Only JPG, PNG and WEBP images are allowed.")
        );
    }
};

// Multer setup
const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5
    }
});

module.exports = upload;
