//tipUser.js
const { SlashCommandBuilder} = require('discord.js');

const SolPayment = require('../../utils/solPayment');

const solPayment = new SolPayment();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tip_user')
		.setDescription('Tip another user SOL')
        .addUserOption(option =>
			option
				.setName('target')
				.setDescription('The member to tip')
				.setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('The amount to tip the user in Lamports')
                .setRequired(true)),
	async execute(interaction) {
		const target = interaction.options.getUser('target');
		const amount = interaction.options.getInteger('amount');
        const success = await solPayment.performTransfer(interaction, amount, target);
        if (success) {
            await interaction.followUp({ content: 'Tip successful!', ephemeral: true });
            await interaction.channel.send(`${target} you have been tipped ${amount} Lamports`)
        } else {
            await interaction.followUp({ content: 'Tip failed. Please try again.', ephemeral: true });
            return;
        }
    }
}