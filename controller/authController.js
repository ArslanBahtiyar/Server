const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/dbConfig");

//JWT Token Oluşturma
const createToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const registerUser = async (req, res) => {
  const { name, email, password, department } = req.body;

  if (!name || !email || !password || !department) {
    return res
      .status(400)
      .json({ message: "Ad, email, şifre ve departman alanları zorunludur." });
  }

  try {
    const existing = await pool.query(
      `SELECT "Email" FROM "Users" WHERE "Email" = $1`,
      [email],
    );
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Bu email adresi zaten kayıtlı." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO "Users" ("Name", "Email", "PasswordHash", "Department")
       VALUES ($1, $2, $3, $4) RETURNING "Id", "Name", "Email"`,
      [name, email, hashedPassword, department],
    );

    const newUser = result.rows[0];
    const token = createToken(newUser.Id, newUser.Email, "user");

    res.status(201).json({
      message: "Kullanıcı başarıyla oluşturuldu.",
      token,
      user: { Id: newUser.Id, Name: newUser.Name, Email: newUser.Email },
    });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve şifre zorunludur." });
  }

  try {
    const result = await pool.query(
      `SELECT "Id", "Name", "Email", "PasswordHash" FROM "Users" WHERE "Email" = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email veya şifre hatalı." });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.PasswordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Email veya şifre hatalı." });
    }

    const token = createToken(user.Id, user.Email, "user");

    res.status(200).json({
      message: "Giriş başarılı.",
      token,
      user: { Id: user.Id, Name: user.Name, Email: user.Email },
    });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const registerCommunity = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Ad, email ve şifre zorunludur." });
  }

  try {
    const existing = await pool.query(
      `SELECT "Email" FROM "Communities" WHERE "Email" = $1`,
      [email],
    );
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Bu email adresi zaten kayıtlı." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO "Communities" ("Name", "Email", "PasswordHash")
       VALUES ($1, $2, $3) RETURNING "Id", "Name", "Email"`,
      [name, email, hashedPassword],
    );

    const newCommunity = result.rows[0];
    const token = createToken(newCommunity.Id, newCommunity.Email, "community");

    res.status(201).json({
      message: "Topluluk başarıyla oluşturuldu.",
      token,
      community: {
        Id: newCommunity.Id,
        Name: newCommunity.Name,
        Email: newCommunity.Email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const loginCommunity = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve şifre zorunludur." });
  }

  try {
    const result = await pool.query(
      `SELECT "Id", "Name", "Email", "PasswordHash" FROM "Communities" WHERE "Email" = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email veya şifre hatalı." });
    }

    const community = result.rows[0];
    const isMatch = await bcrypt.compare(password, community.PasswordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Email veya şifre hatalı." });
    }

    const token = createToken(community.Id, community.Email, "community");

    res.status(200).json({
      message: "Giriş başarılı.",
      token,
      community: {
        Id: community.Id,
        Name: community.Name,
        Email: community.Email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

module.exports = { registerUser, loginUser, registerCommunity, loginCommunity };
