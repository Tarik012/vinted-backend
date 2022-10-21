const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

require("dotenv").config();

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI);

const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");

const port = 3000;

app.use(express.json());
app.use(userRoutes);
app.use(offerRoutes);

app.all("*", (req, res) => {
  res.status(400).json({ message: "route introuvable !" });
});

app.listen(process.env.PORT, () => {
  console.log("Server started🚀");
});
