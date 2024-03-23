require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
// const { findOneWalletByID,findKeyByID } = require('../../db');
const { findOneWalletByID } = require("mars-simple-mongodb"); // Adjust the import path as necessary
const { LAMPORTS_PER_SOL,PublicKey } = require('@solana/web3.js');
const solanaWeb3 = require("@solana/web3.js");

let connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl(process.env.SOLANA_NETWORK), "confirmed");
module.exports = {
	data: new SlashCommandBuilder()
		.setName('get_wallet_balance')
		.setDescription('Check users wallet balance'),
	async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        await interaction.reply({ content: `Fetching Wallet`, ephemeral: true });
        
        try {
            const walletData = await findOneWalletByID('wallets','user_wallets',target.id)
            if(!walletData) {
                interaction.editReply({ content: `You do not have a wallet`, ephemeral: true });
                return;
            }

            const key = new PublicKey( walletData.publicKey);
        
            const balance = await getBalance(key);
            await interaction.editReply({ content: `Wallet Balance: ${balance/LAMPORTS_PER_SOL} SOL`, ephemeral: true });
        } catch (e) {
            console.error(e);
        }
    }
};

async function getBalance(publicKey){
    let balance = await connection.getBalance(publicKey);
    console.log(`${balance / LAMPORTS_PER_SOL} SOL`);
    return balance;
};