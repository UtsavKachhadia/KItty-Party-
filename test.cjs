require("dotenv").config();

console.log("MONGO_URI:", process.env.MONGO_URI); // 👈 MUST print

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected");
  })
  .catch(err => {
    console.log("❌ Error:", err);
  });