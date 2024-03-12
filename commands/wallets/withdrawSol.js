//PurchaseItems.js
const { SlashCommandBuilder} = require('discord.js');

const SolPayment = require('../../utils/solPayment');

const solPayment = new SolPayment();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('withdraw')
		.setDescription('Withdraw Sol to external wallet')
        .addStringOption(option =>
			option
				.setName('target')
				.setDescription('The wallet to withdraw to')
				.setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('The amount to withdraw in Lamports')
                .setRequired(true)),
	async execute(interaction) {
		const target = interaction.options.getString('target');
		const amount = interaction.options.getInteger('amount');
        const success = await solPayment.performWithdraw(interaction, amount, target);
        if (success) {
            await interaction.followUp({ content: 'Withdraw successful!', ephemeral: true });
        } else {
            await interaction.followUp({ content: 'Withdraw failed. Please try again.', ephemeral: true });
            return;
        }
    }
}