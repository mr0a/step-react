// Configuration constants
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "quiz123"; // In production, use environment variables

module.exports = {
  ADMIN_PASSWORD,
  PORT: process.env.PORT || 3000,
};
