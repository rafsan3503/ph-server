const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

// middleWare
app.use(cors());
app.use(express.json());

// test home
app.get("/", (req, res) => {
  res.send("Phonomania is running");
});

// mongodb connection

const uri =
  "mongodb+srv://<username>:<password>@cluster0.nk3n7xe.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// run function
async function run() {
  try {
    const userCollection = client.db("phonomania").collection("users");
  } finally {
  }
}

// function call
run().catch((err) => console.log(err.message));

// listen server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
