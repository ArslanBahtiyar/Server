const dns = require("dns");
// Force all DNS lookups to prefer IPv4 over IPv6 (resolves Render IPv6 ENETUNREACH issues)
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const communityRoute = require("./routes/community");
const eventRoute = require("./routes/event");
const uploadRoute = require("./routes/upload");
const categoryRoute = require("./routes/category");
const interactionRoute = require("./routes/interaction");
const commentRoute = require("./routes/comment");

const app = express();
app.use(cors());
//!json verileri almak için kullanılan middleware
app.use(express.json());

//!Routes kullanma
app.use("/auth", authRoute);
app.use("/user", userRoute);
app.use("/community", communityRoute);
app.use("/events", eventRoute);
app.use("/upload", uploadRoute);
app.use("/categories", categoryRoute);
app.use("/interaction", interactionRoute);
app.use("/comment", commentRoute);

app.get("/", (req, res) => {
  res.send("API çalışıyor ve yayında!");
});

app.listen(process.env.PORT, () => {
  console.log(`${process.env.PORT}. port dinleniyor`);
});
