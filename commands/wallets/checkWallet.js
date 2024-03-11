require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const { client } = require("../../db.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('get_wallet_address')
		.setDescription('Check users wallet address'),
	async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        await interaction.reply({ content: `Fetching Wallet`, ephemeral: true });
        
        try {
            // Connect to the MongoDB cluster
            await client.connect();
            const walletData = await findOneWalletByID(client,target.id)
            if(!walletData) {
                interaction.editReply({ content: `You do not have a wallet`, ephemeral: true });
                return;
            }

            await interaction.editReply({ content: `Wallet Address: ${walletData.publicKey}`, ephemeral: true });
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
        console.log(`No wallets found for user with the id '${id}'`);
        return false;
    }
}
