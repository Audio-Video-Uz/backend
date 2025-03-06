const jwt = require("jsonwebtoken");
const Admin = require("../model/admin");

module.exports = function getAdmin(req, res) {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1]; // 'Bearer <token>' formatidan tokenni ajratib olish

  if (!token) {
    return res.status(401).json({ message: "Authorization token required" });
  }

  jwt.verify(token, "java", (err, decodedToken) => {
    if (err) {
      console.error("JWT Error:", err); // Xatolikni konsolga chiqarish
      return res.status(401).json({ message: "Unauthorized" });
    }

    Admin.find()
      .then((admins) => {
        if (!admins || admins.length === 0) {
          return res.status(404).json({ message: "No admins found" });
        }
        res.json({ adminData: admins });
      })
      .catch((err) => {
        console.error("Database error:", err);
        res.status(500).json({ message: "Internal server error" });
      });
  });
};
