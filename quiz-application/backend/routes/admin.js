// Admin routes
const express = require("express");
const path = require("path");
const { ADMIN_PASSWORD } = require("../config/constants");

const router = express.Router();

// Serve admin.html
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

// Verify admin password
router.post("/verify", (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (password === ADMIN_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  } catch (error) {
    console.error("Error verifying admin password:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during verification",
    });
  }
});

module.exports = router;
