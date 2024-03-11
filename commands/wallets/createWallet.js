// createWallet.js
require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const solanaWeb3 = require("@solana/web3.js");
const fs = require("fs");
// const { MongoClient } = require('mongodb');

// const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.zdr3lzw.mongodb.net/wallets?retryWrites=true&w=majority`;
const { client } = require("../../db.js");
const {generateKey, encrypt, decrypt} = require ("../../encryption.js")

let connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");
// const client = new MongoClient(uri);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create_wallet')
		.setDescription('Creates a wallet for user'),
	async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        try {
            // Connect to the MongoDB cluster
            await client.connect();
            const hasWallet = await findOneWalletByID(client,target.id)
            if(hasWallet) {
                interaction.reply({ content: `You already have a wallet`, ephemeral: true });
                return;
            }
            await interaction.reply({ content: `Creating Wallet`, ephemeral: true });
            const keys = await generateWallet();
            const encryptKey = generateKey();
            // const user = {id:target.id,key:encryptKey.toString('hex')}
            try {
                // reading a JSON file synchronously
                // const jsonData  = fs.readFileSync("user.json");
                // const users = JSON.parse(jsonData);
                // users[target.id] = [user]
                // const data = JSON.stringify(users);
                // fs.writeFileSync("user.json", data);
                await saveKey(client,
                    {
                        _id:target.id,
                        key:encryptKey.toString('hex')
                    });

            } catch (error) {
                // logging the error
                console.error(error);
            
                throw error;
            }

            const encryptSecret = encrypt(encryptKey,keys.secretKey)
        
            await saveWallet(client,
                {
                    _id:target.id,
                    publicKey: keys.publicKey.toBase58(),
                    secretKey:encryptSecret.encryptedData,
                    iv:encryptSecret.iv
                });
            await interaction.editReply({ content: `Wallet Address: ${keys.publicKey} \n Visit https://solfaucet.com/ to get soem test SOL`, ephemeral: true });
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }


    }
};

async function findOneWalletByID(client, id) {
    const result = await client.db(process.env.MONGO_DB_NAME).collection(process.env.MONGO_DB_COLLECTION).findOne({ _id: id });

    if (result) {
        console.log(`Found a wallet in the collection for user with the id '${id}':`);
        return true;
    } else {
        console.log(`No wallet found for user with the id '${id}'`);
        return false;
    }
}


async function generateWallet(){
    let keypair = solanaWeb3.Keypair.generate();
    return keypair;
}

async function saveWallet(client, entry){
    const result = await client.db(process.env.MONGO_DB_NAME).collection(process.env.MONGO_DB_COLLECTION).insertOne(entry);
    console.log(`New Wallet created for ${entry.user} with public key ${entry.publicKey}`);
}
async function saveKey(client, entry){
    const result = await client.db(process.env.MONGO_DB_NAME).collection('keys').insertOne(entry);
    console.log(`key saved`);
}
