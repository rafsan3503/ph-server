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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nk3n7xe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// run function
async function run() {
  try {
    // user collection
    const userCollection = client.db("phonomania").collection("users");
    // products collection
    const productsCollection = client.db("phonomania").collection("products");

    // set user and send jwt token
    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user.email;

      const query = { email: email };
      const savedUser = await userCollection.findOne(query);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      if (savedUser) {
        return res.send({ token });
      }
      const result = await userCollection.insertOne(user);
      res.send({ result, token });
    });

    // post product
    app.post("/products", async (res, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
  } finally {
  }
}

// function call
run().catch((err) => console.log(err.message));

// listen server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
