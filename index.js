const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_KEY);

// middleWare
app.use(cors());
app.use(express.json());

// test home
app.get("/", (req, res) => {
  res.send("Phonomania is running");
});

// jwt verify
const verifyJwt = (req, res, next) => {
  const authToken = req.headers.authorization;
  if (!authToken) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(authToken, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "invalid token" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    // category collection
    const categoryCollection = client.db("phonomania").collection("categories");
    // my orders collection
    const orderCollection = client.db("phonomania").collection("orders");
    // payment collection
    const paymentsCollection = client.db("phonomania").collection("payments");

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

    // get categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoryCollection.find(query).toArray();
      res.send(categories);
    });

    // get products by category id
    app.get("/categories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { categoryId: id, salesStatus: "available" };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    // get products for my products
    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    // get advertised product
    app.get("/advertised", async (req, res) => {
      const query = { advertisement: true, salesStatus: "available" };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    // post product
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // delete product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // report product
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      console.log(query);
      const updateDoc = {
        $set: {
          report: true,
        },
      };
      const result = await productsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // advertise product
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          advertisement: true,
        },
      };
      const result = await productsCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // post orders
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const productId = order.productId;
      const email = order.email;
      const query = { productId: productId, email: email };
      const exitsBooking = await orderCollection.findOne(query);
      if (exitsBooking) {
        return res.send({
          error: true,
          message: "You already booked this product",
        });
      }
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // get orders
    app.get("/orders", verifyJwt, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    // get single order
    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });

    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 1000;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount,
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // create and update payment
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const id = payment.bookingId;
      const productId = payment.productId;
      const query = { _id: ObjectId(productId) };
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          paid: true,
          salesStatus: "sold",
        },
      };

      const updateResult = await productsCollection.updateOne(
        query,
        updateDoc,
        options
      );
      const updateOrder = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const result = await paymentsCollection.insertOne(payment);

      res.send({ result, updateResult, updateOrder });
    });
    // get buyers
    app.get("/buyers", async (req, res) => {
      const query = { role: "Buyer" };
      const buyers = await userCollection.find(query).toArray();
      res.send(buyers);
    });

    // delete buyer
    app.delete("/buyers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // get sellers
    app.get("/sellers", async (req, res) => {
      const query = { role: "Seller" };
      const sellers = await userCollection.find(query).toArray();
      res.send(sellers);
    });

    // delete seller
    app.delete("/sellers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // verify seller
    app.put("/sellers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verified: true,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // check verify seller
    app.get("/verify", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.verified === true) {
        return res.send({ isVerified: true });
      }
      res.send({ isVerified: false });
    });

    // get reported products
    app.get("/reported", async (req, res) => {
      const query = { report: true };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
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
