const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pqpiudt.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    // maxPoolSize: 10,
});

// get token from client;
const verifyJWT = (req, res, next) => { // app.get(..) e ei func call er pore thaka kaj gulo mane, code gulo execute / run korabe arki;
    console.log("hitting verify JWT");
    console.log(req.headers.authorization);

    const authorization = req.headers.authorization;
    if (!authorization) { // if token is empty;
        return res.status(401).send({ error: true, message: "unauthorized access" }) // error: true mane, err hoiche arki;
    }
    const token = authorization.split(" ")[1]; // const n = token[1];
    console.log("token inside verify jwt", token);

    // verify token;
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => { // decoded = user information;
        if (err) {
            return res.status(401).send({ error: true, message: "unauthorized access" }) // if token is invalid / don't match;
        }
        // else { // if token is valid;
        req.decoded = decoded; // req.anyNm = decoded; // decoded = user information; // req hocche obj jar moddhe decoded mane usr info set kore dicchi jeno, app.get(..) e giye decoded / user info access korte pari arki;
        next(); // ei verifyJWT func er kaj ses houar pore je app.get(...) theke call kora hocche sekhane giye porer kaj gulo korbe; jokhon token valid hobe tokhon next() call hobe karon err khele to return kore functionality off kora hocchei;
        // }
    })
};

//
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        client.connect();
        // client.connect(err => {
        //     if (err) {
        //         console.error(err);
        //         return;
        //     }
        // })


        const servicesCollection = client.db("carDoctor").collection("services");
        const bookingCollection = client.db("carDoctor").collection("bookings"); // another collection; ekta datar collection er moddhe arekta dhukai dile bekhappa hoye jabe, ager collection er datagulo jodi UI te dekhai tahole onno type er data gulo o UI te hsow korbe tai arekta collection banate pari arki.

        // jwt
        app.post("/jwt", (req, res) => {
            const user = req.body;
            console.log(user);

            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1hr" }); // 5 / any second o dite pari;
            res.send({ token });
            console.log({ token }); // {key(token) : value(tokenValue)} // obj baniye pathate hobe jeno client theke res.json() e convert kora jay, nahole json is not valid dibe, karon obj na banale string thakbe arki;
        });

        // services routes;
        // multiple data get
        app.get("/services", async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        // single data get
        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };

            const options = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 }, // if prop is required then use key: 1. and not required then use kay: 0; and _id ke 1 na bole dilew thakbe ar 0 bolle thakbe na arki;
            };

            const result = await servicesCollection.findOne(query, options);
            res.send(result);
        });

        // bookings
        // get specific data for right user;
        app.get("/bookings", verifyJWT, async (req, res) => { // call and active verifyJWT func;
            const decoded = req.decoded;
            console.log("came back after verify", decoded);

            if (decoded.email !== req.query.email) { // token amar but arekjoner data chaile data er access na diye err dibo;
                return res.status(403).send({ error: 1, message: "forbidden access" });
            };

            // console.log(req.query.email); // req.query.queryNm;
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            };

            // const cursor = bookingCollection.find();
            // const result = await cursor.toArray();
            const result = await bookingCollection.find(query).toArray(); // cursor = bookingCollection.find()
            res.send(result);
        });

        app.post("/bookings", async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        // patch
        app.patch("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            console.log(updatedBooking);

            // const options = { upsert: true }; // use only put
            const updateDoc = {
                $set: {
                    status: updatedBooking.status, // { status = "confirm" } // new propNm add korte pari arki;
                },
            };

            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("doctor is running");
});

app.listen(port, () => {
    console.log("doctor is running on port:", port);
});