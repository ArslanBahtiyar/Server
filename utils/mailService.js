const nodemailer = require("nodemailer");
const dns = require("dns");

// Force DNS resolution to prioritize IPv4 over IPv6 to resolve ENETUNREACH issues on cloud hosts like Render
dns.setDefaultResultOrder("ipv4first");

// Custom DNS lookup that strictly forces IPv4
const customLookup = (hostname, options, callback) => {
  if (typeof options === "function") {
    callback = options;
    options = { family: 4 };
  } else if (!options) {
    options = { family: 4 };
  } else {
    options.family = 4;
  }
  return dns.lookup(hostname, options, callback);
};

// SMTP Transporter Oluşturma
const getTransporter = async () => {
  console.log("🔍 Transporter oluşturma başlatıldı...");
  // Eğer .env dosyasında gerçek e-posta sunucu bilgileri varsa bunları kullan
  if (
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  ) {
    let resolvedHost = process.env.EMAIL_HOST;
    try {
      console.log(`🔍 ${process.env.EMAIL_HOST} için IPv4 DNS çözümlemesi yapılıyor...`);
      const ips = await dns.promises.resolve4(process.env.EMAIL_HOST);
      if (ips && ips.length > 0) {
        resolvedHost = ips[0];
        console.log(`✅ ${process.env.EMAIL_HOST} başarıyla IPv4 adresine çözümlendi: ${resolvedHost}`);
      }
    } catch (dnsErr) {
      console.error("⚠️ DNS Çözümleme hatası, orijinal host kullanılacak:", dnsErr);
    }

    console.log("📝 Gerçek SMTP ayarları yükleniyor:", {
      host: resolvedHost,
      originalHost: process.env.EMAIL_HOST,
      user: process.env.EMAIL_USER,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE
    });

    // Gmail için özel optimize edilmiş bağlantı (Premium Best Practice)
    // if (process.env.EMAIL_HOST.includes("gmail")) {
    //   console.log("➡️ Gmail servisi seçildi.");
    //   return nodemailer.createTransport({
    //     service: "gmail",
    //     auth: {
    //       user: process.env.EMAIL_USER,
    //       pass: process.env.EMAIL_PASS,
    //     },
    //     family: 4, // Force IPv4 to resolve ENETUNREACH issues on Render
    //     connectionTimeout: 8000,
    //     greetingTimeout: 8000,
    //     socketTimeout: 8000,
    //   });
    // }

    console.log("➡️ Genel SMTP servisi seçildi.");
    return nodemailer.createTransport({
      host: resolvedHost,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        servername: process.env.EMAIL_HOST, // SSL/TLS sertifika doğrulaması için orijinal host ismini belirtiyoruz
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
  }

  // Yoksa geliştirme/test ortamı için dinamik olarak Ethereal test hesabı oluştur (Premium Best Practice)
  console.log("⚠️ EMAIL ayarları .env dosyasında bulunamadı. Test ortamı (Ethereal Email) başlatılıyor...");
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    lookup: customLookup, // Force IPv4
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
};

const sendTemporaryPasswordEmail = async (email, name, tempPassword) => {
  try {
    console.log("📩 sendTemporaryPasswordEmail fonksiyonu tetiklendi. Kime:", email);

    // Premium HTML E-Posta Tasarımı
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sende Katıl - Geçici Şifreniz</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 500px;
            background-color: #ffffff;
            margin: 0 auto;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
          }
          .header {
            background-color: #2563eb;
            color: #ffffff;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .content {
            padding: 30px;
          }
          .content p {
            color: #4b5563;
            font-size: 15px;
            line-height: 1.6;
            margin: 0 0 20px 0;
          }
          .content strong {
            color: #111827;
          }
          .temp-password-box {
            background-color: #f1f5f9;
            border: 2px dashed #2563eb;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 25px 0;
          }
          .temp-password-box span {
            display: block;
            font-size: 11px;
            color: #64748b;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 6px;
          }
          .temp-password-box h2 {
            margin: 0;
            font-size: 28px;
            color: #2563eb;
            font-weight: 800;
            letter-spacing: 2px;
          }
          .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #f3f4f6;
          }
          .footer p {
            color: #9ca3af;
            font-size: 12px;
            margin: 0;
          }
          .info-note {
            background-color: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .info-note p {
            color: #1e3a8a;
            font-size: 13px;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SENDE KATIL</h1>
          </div>
          <div class="content">
            <p>Merhaba <strong>${name}</strong>,</p>
            <p>Sende Katıl hesabınız için şifre sıfırlama talebinde bulundunuz. Hesabınız için güvenli ve geçici bir şifre oluşturulmuştur:</p>
            
            <div class="temp-password-box">
              <span>GEÇİCİ ŞİFRENİZ</span>
              <h2>${tempPassword}</h2>
            </div>

            <div class="info-note">
              <p>🔒 <strong>Güvenlik Uyarısı:</strong> Lütfen bu şifreyi kullanarak sisteme giriş yaptıktan sonra, **Profil > Ayarlar** kısmından şifrenizi kendinize özel yeni bir şifreyle değiştirmeyi unutmayınız.</p>
            </div>

            <p>Keyifli etkinlikler dileriz!<br>Sende Katıl Ekibi</p>
          </div>
          <div class="footer">
            <p>© 2026 Sende Katıl. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Eğer Brevo API Key (xkeysib-) tanımlandıysa, HTTPS API üzerinden gönder (Port 443 asla engellenemez)
    if (
      process.env.EMAIL_HOST && 
      process.env.EMAIL_HOST.includes("brevo") && 
      process.env.EMAIL_PASS && 
      process.env.EMAIL_PASS.startsWith("xkeysib-")
    ) {
      console.log("🚀 Brevo API Key (xkeysib-) algılandı, HTTPS API (Port 443) üzerinden gönderiliyor...");
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": process.env.EMAIL_PASS,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "Sende Katıl", email: process.env.EMAIL_USER },
          to: [{ email: email, name: name }],
          subject: "Sende Katıl - Geçici Şifreniz",
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Brevo HTTPS API Hatası (${response.status}): ${JSON.stringify(errData)}`);
      }

      const resData = await response.json();
      console.log("✉️ Brevo HTTPS API ile mail başarıyla gönderildi:", resData);
      return resData;
    }

    // Klasik SMTP Fallback (Gmail veya xsmtpsib- SMTP anahtarı kullanan Brevo için)
    console.log("🚀 SMTP Protokolü üzerinden gönderim başlatılıyor...");
    const transporter = await getTransporter();
    console.log("✅ Transporter başarıyla oluşturuldu.");

    // Eğer EMAIL_USER bir SMTP login adresi ise (örn: @smtp-brevo.com), gerçek gönderici mailimizi kullanmalıyız
    const senderEmail = process.env.EMAIL_USER && process.env.EMAIL_USER.includes("@smtp-brevo.com")
      ? "ssendekatil@gmail.com" // Brevo'da kayıtlı ve doğrulanmış gerçek mail adresiniz
      : process.env.EMAIL_USER;

    const mailOptions = {
      from: `"Sende Katıl" <${senderEmail}>`,
      to: email,
      subject: "Sende Katıl - Geçici Şifreniz",
      html: htmlContent,
    };

    console.log("📤 Mail gönderme isteği (sendMail) başlatılıyor...");
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Geçici şifre maili ${email} adresine gönderildi.`);

    if (transporter.options.host === "smtp.ethereal.email") {
      console.log("🔗 Geliştirici Test Maili Önizleme URL:");
      console.log(nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (err) {
    console.error("❌ E-posta gönderme hatası (mailService içinde):", err);
    throw err;
  }
};

module.exports = {
  sendTemporaryPasswordEmail,
};
