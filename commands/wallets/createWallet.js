// createWallet.js
require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const solanaWeb3 = require("@solana/web3.js");
const fs = require("fs");
// const { saveWallet, findOneWalletByID, saveKey} = require('../../db');
const { saveWallet, findOneWalletByID, saveKey } = require("mars-simple-mongodb"); // Adjust the import path as necessary

// const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.zdr3lzw.mongodb.net/wallets?retryWrites=true&w=majority`;
const {generateKey, encrypt, decrypt} = require ("../../encryption.js")

let connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create_wallet')
		.setDescription('Creates a wallet for user'),
	async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        try {
            const hasWallet = await findOneWalletByID('wallets','user_wallets',target.id)
            if(hasWallet) {
                interaction.reply({ content: `You already have a wallet`, ephemeral: true });
                return;
            }
            await interaction.reply({ content: `Creating Wallet`, ephemeral: true });
            const keys = await generateWallet();
            const encryptKey = generateKey();
            try {
                await saveKey(
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
        
            await saveWallet('wallets','user_wallets',
                {
                    _id:target.id,
                    publicKey: keys.publicKey.toBase58(),
                    secretKey:encryptSecret.encryptedData,
                    iv:encryptSecret.iv
                });
            await interaction.editReply({ content: `Wallet Address: ${keys.publicKey} \n Visit https://solfaucet.com/ to get soem test SOL`, ephemeral: true });
        } catch (e) {
            console.error(e);
        }


    }
};

async function generateWallet(){
    let keypair = solanaWeb3.Keypair.generate();
    return keypair;
}