const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token bulunamadı, erişim reddedildi." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, role: "user" | "community" }
        next();
    } catch (err) {
        return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token." });
    }
};

module.exports = { verifyToken };
