import express from 'express';
import cors from "cors";
import { MongoClient } from 'mongodb';
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

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
const connectedClient= await connectToMongoDB();
const database = connectedClient.db("hirloop-db");
const users = database.collection("users")


app.get('/', (req, res) => {
  res.send('hireloop is looping');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});