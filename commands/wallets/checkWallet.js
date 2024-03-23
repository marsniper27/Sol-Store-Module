require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
// const { findOneWalletByID} = require('../../db');
const { findOneWalletByID } = require("mars-simple-mongodb"); // Adjust the import path as necessary

module.exports = {
	data: new SlashCommandBuilder()
		.setName('get_wallet_address')
		.setDescription('Check users wallet address'),
	async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        await interaction.reply({ content: `Fetching Wallet`, ephemeral: true });
        
        try {
            const walletData = await findOneWalletByID('wallets','user_wallets',target.id)
            if(!walletData) {
                interaction.editReply({ content: `You do not have a wallet`, ephemeral: true });
                return;
            }

            await interaction.editReply({ content: `Wallet Address: ${walletData.publicKey}`, ephemeral: true });
        } catch (e) {
            console.error(e);
        }
    }
};
