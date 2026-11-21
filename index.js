import express from 'express';
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';
import "dotenv/config";
import Stripe from 'stripe';

const app = express();
const PORT = process.env.PORT || 5000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

//middleware
app.use(express.json())
app.use(cors())



// mongodb database connect
const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const connectedClient = await connectToMongoDB();
const database = connectedClient.db("hirloop-db");
const users = database.collection("user")
const jobs = database.collection("jobs")
const applications = database.collection("applications")
const payments = database.collection("payments")



app.get('/', (req, res) => {
  res.send('hireloop is looping');
});


// mongodb collection user get data by api
app.get('/users', async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray()
  res.send(result);
})


app.get('/users/:id/premium', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await users.findOne(query, { projection: { premium: 1 } });
  res.send(result);
})








// mongodb collection jobs all Method

// mongodb collection jobs get data by api
app.get('/jobs', async (req, res) => {

  const query = {};

  if (req.query) {
    if (req.query.jobType) {
      query.jobType = req.query.jobType;
    }
    if (req.query.isRemote) {
      query.isRemote = req.query.isRemote === 'true';
    }
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.search) {

      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { company: { $regex: req.query.search, $options: "i" } },
        { responsibilities: { $regex: req.query.search, $options: "i" } },
        { requirements: { $regex: req.query.search, $options: "i" } }
      ]

    }

  }

  const cursor = jobs.find(query);
  const result = await cursor.toArray()
  res.send(result);
})

// mongodb collection jobs post data by api
app.post('/jobs', async (req, res) => {
  const job = req.body;
  const result = await jobs.insertOne(job);
  res.send(result);
})

// mongodb collection single job delete data by api
app.delete('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await jobs.deleteOne(query);
  res.send(result);
})

// mongodb collection single job update data by api
app.patch('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const result = await jobs.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
  res.send(result);
})

// mongodb collection single job get data by api
app.get('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await jobs.findOne(query);
  res.send(result);
})

// applications related API


app.get('/applications', async (req, res) => {
  const query = {};
  if (req.query.applicantId) {
    query.userId = req.query.applicantId;
  }
  const cursor = applications.find(query)
  const result = await cursor.toArray()
  res.send(result);
}),

  app.get('/applications/count', async (req, res) => {
    const query = {};
    if (req.query.applicantId) {
      query.userId = req.query.applicantId;
    }
    const result = await applications.countDocuments(query);
    res.send({ count: result });
  }),


  app.post('/applications', async (req, res) => {
    const application = req.body;
    const result = await applications.insertOne(application);
    res.send(result);



  })




// payments related API
app.post('/payments/payment-verify', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.send({ success: false, message: 'Session ID is required' });
    }

    const {
        status,
        payment_status,
        customer_email,
        metadata,
        payment_intent,
    } = await stripe.checkout.sessions.retrieve(sessionId);

    // 1. is used new session 
    // 2. check is the session id for the currently logged in user
    // 3. insert sessionId into the payment Collection
    // 4. update user information as premium user

    if (status === 'complete' && payment_status === 'paid') {

      
        const payment = {
            sessionId,
            status,
            payment_status,
            customer_email,
            userId: metadata.userId,
            payment_date: new Date(),
            payment_intent,
        }

        const result = await payments.updateOne(
    { sessionId },
    { $setOnInsert: payment },
    { upsert: true }
);

        // update the user table
        const query = { email: metadata.userId };

        const updatedDoc = {
            $set: {
                premium: true,
            }
        }
        const updateResult = await users.updateOne(
            query,
            updatedDoc
        );
        res.send({ success: true, result, updateResult });
        return
    }
    res.send({ success: false, message: 'Payment verification failed' });
})


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});