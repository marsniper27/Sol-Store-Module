require('dotenv').config();
const { MongoClient } = require('mongodb');

// Construct the MongoDB URI using environment variables
const dbUri = process.env.MONGO_DB_ADDRESS
const uri = dbUri.replace("<password>",process.env.MONGO_PASSWORD);

// Create a MongoClient instance with the constructed URI
const client = new MongoClient(uri);

// Export the client instance for use in other files
module.exports = { client };
