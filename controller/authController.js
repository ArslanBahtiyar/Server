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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "Geçersiz e-posta formatı." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Şifre en az 6 karakter olmalıdır." });
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "Geçersiz e-posta formatı." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Şifre en az 6 karakter olmalıdır." });
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

const { sendTemporaryPasswordEmail } = require("../utils/mailService");

const generateRandomPassword = (length = 8) => {
  // Karıştırılabilecek karakterleri (I, l, 1, O, 0 gibi) çıkarttığımız premium karakter havuzu:
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("📩 Şifre sıfırlama isteği alındı. E-posta:", email);

  if (!email) {
    console.log("⚠️ Şifre sıfırlama hatası: E-posta adresi boş.");
    return res.status(400).json({ message: "E-posta adresi zorunludur." });
  }

  try {
    // 1. Önce öğrenci tablosunda ara
    console.log("🔍 Veritabanında kullanıcı aranıyor...");
    let userResult = await pool.query(
      `SELECT "Id", "Name", "Email" FROM "Users" WHERE "Email" = $1`,
      [email.trim()]
    );
    let target = userResult.rows[0];
    let role = "user";

    // 2. Bulunamadıysa topluluk tablosunda ara
    if (!target) {
      console.log("🔍 Kullanıcı bulunamadı, topluluk aranıyor...");
      const communityResult = await pool.query(
        `SELECT "Id", "Name", "Email" FROM "Communities" WHERE "Email" = $1`,
        [email.trim()]
      );
      target = communityResult.rows[0];
      role = "community";
    }

    if (!target) {
      console.log("❌ Hesap bulunamadı:", email.trim());
      return res.status(404).json({ message: "Bu e-posta adresine ait bir hesap bulunamadı." });
    }

    console.log(`✅ Hesap bulundu. Rol: ${role}, İsim: ${target.Name}`);

    // 3. Rastgele geçici şifre oluştur
    const tempPassword = generateRandomPassword(8);

    // 4. Şifreyi hash'le ve veritabanını güncelle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    console.log("🔄 Veritabanında şifre güncelleniyor...");
    if (role === "user") {
      await pool.query(
        `UPDATE "Users" SET "PasswordHash" = $1 WHERE "Id" = $2`,
        [hashedPassword, target.Id]
      );
    } else {
      await pool.query(
        `UPDATE "Communities" SET "PasswordHash" = $1 WHERE "Id" = $2`,
        [hashedPassword, target.Id]
      );
    }
    console.log("✅ Veritabanında şifre başarıyla güncellendi.");

    // 5. Geçici şifre mailini gönder
    console.log("✉️ E-posta gönderme işlemi başlatılıyor...");
    await sendTemporaryPasswordEmail(target.Email, target.Name, tempPassword);
    console.log("✉️ E-posta başarıyla gönderildi.");

    res.status(200).json({
      message: "Geçici şifreniz e-posta adresinize gönderildi. Giriş yaptıktan sonra şifrenizi değiştirmeyi unutmayın.",
    });
  } catch (err) {
    console.error("❌ Şifremi unuttum hatası detayı:", err);
    res.status(500).json({ message: "Sunucu hatası.", error: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token ve yeni şifre zorunludur." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Yeni şifre en az 6 karakter olmalıdır." });
  }

  try {
    // 1. Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, email, role } = decoded;

    // 2. Yeni şifreyi hash'le
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 3. Rolüne göre uygun tabloyu güncelle
    let result;
    if (role === "user") {
      result = await pool.query(
        `UPDATE "Users" SET "PasswordHash" = $1 WHERE "Id" = $2 AND "Email" = $3 RETURNING "Id"`,
        [hashedPassword, id, email]
      );
    } else {
      result = await pool.query(
        `UPDATE "Communities" SET "PasswordHash" = $1 WHERE "Id" = $2 AND "Email" = $3 RETURNING "Id"`,
        [hashedPassword, id, email]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Kullanıcı kaydı bulunamadı veya şifre güncellenemedi." });
    }

    res.status(200).json({ message: "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz." });
  } catch (err) {
    console.error("Şifre sıfırlama hatası:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Sıfırlama bağlantısının süresi dolmuş. Lütfen yeniden talep gönderin." });
    }
    res.status(401).json({ message: "Geçersiz veya bozuk sıfırlama bağlantısı." });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerCommunity,
  loginCommunity,
  forgotPassword,
  resetPassword,
};
