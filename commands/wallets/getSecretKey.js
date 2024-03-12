//getSecretKey.js
require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const fs = require("fs");
const { decrypt} = require ("../../encryption.js")
const { findOneWalletByID,findKeyByID } = require('../../db');
const bs58 = require('bs58');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('get_wallet_secret')
		.setDescription('Export users wallet secret'),
	async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        const targetId = target.id;
        try {
            await interaction.reply({ content: `Fetching Wallet`, ephemeral: true });
            const walletData = await findOneWalletByID(target.id)
            if(!walletData) {
                interaction.reply({ content: `You do not have a wallet`, ephemeral: true });
                return;
            }

            try {
                const userKey = await findKeyByID(target.id)
                const key = Buffer.from(userKey.key.toString(), 'hex')
            
                const decryptedSecret = decrypt(key,{iv:walletData.iv,encryptedData:walletData.secretKey});
                
                await interaction.editReply({ content: `Wallet Address: ${walletData.publicKey} \n Secret Key : ${bs58.encode(decryptedSecret)}`, ephemeral: true });
            } catch (error) {
                // logging the error
                console.error(error);
            
                throw error;
            }
       
        } catch (e) {
            console.error(e);
        }


    }
};