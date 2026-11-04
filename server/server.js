
const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

// Connect SQLite Database
const db = require("./database/database");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve Test Page
app.use(express.static(
    path.join(__dirname, "public")
));

// Product routes
const productRoutes = require("./routes/productRoutes");

// API routes
app.use("/api/products", productRoutes);

// Serve uploaded images
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// Test route
app.get("/", (req, res) => {
    res.send("Mottainai Connect Backend is Running!");
});

// Error handling
app.use((err, req, res, next) => {

    console.error(err.message);

    if (err instanceof require("multer").MulterError) {

        return res.status(400).json({
            success: false,
            message: err.code === "LIMIT_FILE_SIZE"
                ? "Image must be 5 MB or smaller."
                : err.message
        });
    }

    res.status(400).json({
        success: false,
        message: err.message || "Something went wrong."
    });
});

// Start server
app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});
