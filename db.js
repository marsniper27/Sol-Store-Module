//db.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

// Construct the MongoDB URI using environment variables
const dbUri = process.env.MONGO_DB_ADDRESS;
const uri = dbUri.replace("<password>", process.env.MONGO_PASSWORD);
let client = null;
let dbInstance = null;

// Initialize the MongoDB client
if (process.env.SKIP_DB_INIT !== 'true') {
    client = new MongoClient(uri);

}

// Connect to MongoDB and return the database instance

async function connectDB() {
    if (!dbInstance) {
        await client.connect();
        dbInstance = client.db(process.env.MONGO_DB_NAME);
    }
    return dbInstance;
}

// Save a wallet entry in the database
async function saveWallet(entry) {
    const db = await connectDB();
    const result = await db.collection(process.env.MONGO_DB_COLLECTION).insertOne(entry);
    console.log(`New Wallet created for ${entry.user} with public key ${entry.publicKey}`);
}

// Find a wallet by ID
async function findOneWalletByID(id) {
    const db = await connectDB();
    const result = await db.collection(process.env.MONGO_DB_COLLECTION).findOne({ _id: id });

    if (result) {
        console.log(`Found a wallet in the collection for user with the id '${id}':`);
        return result;
    } else {
        console.log(`No wallet found for user with the id '${id}'`);
        return false;
    }
}

// Save an encryption key entry in the database
async function saveKey(entry) {
    const db = await connectDB();
    const result = await db.collection('keys').insertOne(entry);
    console.log(`Key saved for user with ID: ${entry._id}`);
}

// Find an encryption key by ID
async function findKeyByID(id) {
    const db = await connectDB();
    const result = await db.collection('keys').findOne({ _id: id });

    if (result) {
        console.log(`Found a key in the collection for user with the id '${id}':`);
        return result;
    } else {
        console.log(`No key found for user with the id '${id}'`);
        return false;
    }
}

process.on('SIGINT', async () => {
    await client.close();
    process.exit();
});

// Export the functions for use in other files
module.exports = { saveWallet, findOneWalletByID, saveKey, findKeyByID };
