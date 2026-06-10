const dotenv = require("dotenv");
dotenv.config();

const { sendTemporaryPasswordEmail } = require("./utils/mailService");

async function testMail() {
  console.log("Testing email with:");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "****" : "missing");
  try {
    const res = await sendTemporaryPasswordEmail("ssendekatil@gmail.com", "Test User", "Temp12345");
    console.log("Mail sent successfully!", res);
  } catch (err) {
    console.error("Failed to send mail:", err);
  }
}

testMail();
