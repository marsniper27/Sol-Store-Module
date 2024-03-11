//getSecretKey.js
require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const fs = require("fs");
const { client } = require("../../db.js");
const { decrypt} = require ("../../encryption.js")
const bs58 = require('bs58');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('get_wallet_secret')
		.setDescription('Export users wallet secret'),
	async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        const targetId = target.id;
        try {
            // Connect to the MongoDB cluster
            await client.connect();
            await interaction.reply({ content: `Fetching Wallet`, ephemeral: true });
            const walletData = await findOneWalletByID(client,target.id)
            if(!walletData) {
                interaction.reply({ content: `You do not have a wallet`, ephemeral: true });
                return;
            }

            try {
                // reading a JSON file synchronously
                const jsonData = fs.readFileSync("user.json");
                const users = JSON.parse(jsonData);
                const user = users[targetId];
                const key = Buffer.from(user[0].key.toString(), 'hex')
            
                const decryptedSecret = decrypt(key,{iv:walletData.iv,encryptedData:walletData.secretKey});
                
                await interaction.editReply({ content: `Wallet Address: ${walletData.publicKey}, Secret Key : ${bs58.encode(decryptedSecret)}`, ephemeral: true });
            } catch (error) {
                // logging the error
                console.error(error);
            
                throw error;
            }
       
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
        return result;
    } else {
        console.log(`No wallet found for user with the name '${id}'`);
        return false;
    }
}
