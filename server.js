const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const communityRoute = require("./routes/community");
const eventRoute = require("./routes/event");

const app = express();
app.use(cors());
//!atılan isteklerin loglarını görmek için kullanılan middleware
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});
//!json verileri almak için kullanılan middleware
app.use(express.json());

//!Routes kullanma
app.use("/auth", authRoute);
app.use("/user", userRoute);
app.use("/community", communityRoute);
app.use("/events", eventRoute);

app.listen(process.env.PORT, () => {
  console.log(`${process.env.PORT}. port dinleniyor`);
});
