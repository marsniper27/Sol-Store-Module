//sendNft.js
//nftSelector.js
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Metaplex, keypairIdentity, bundlrStorage, toMetaplexFileFromBrowser } = require('@metaplex/js');
const { Connection, PublicKey,Keypair } = require('@solana/web3.js');
const { findOneWalletByID, findKeyByID } = require('../../db');
const { decrypt } = require("../../encryption");
const NftSelector = require('../../embeds/nftSelector');
const SolPayment = require('../../utils/solPayment');

const solPayment = new SolPayment();
const nftSelector = new NftSelector();

module.exports = {
	data: new SlashCommandBuilder()
    .setName('send_nft')
    .setDescription('Send Nft')
    .addUserOption(option =>
        option
            .setName('target')
            .setDescription('The member to send NFT to')
            .setRequired(false))
    .addStringOption(option =>
        option
            .setName('wallet')
            .setDescription('Awallet to send NFT too')
            .setRequired(false)),
	async execute(interaction) {
        
		const target = interaction.options.getUser('target');
		const wallet = interaction.options.getString('wallet');
        let targetIsUser = true;
        let recipient = target;
        if(!target && !wallet){
            await interaction.reply({content:'Please specify a user or wallet to send nft too.'})
            return;
        }
        
        if(target && wallet){
            await interaction.reply({content:'Please specify a user or wallet not both.'})
            return;
        }

        if(!target){ 
            targetIsUser = false;
            recipient = wallet;
        }

        const userKeypair = await initUserKeypair(interaction.user.id)
        const walletAddress = userKeypair.publicKey // Assuming you're asking users for their wallet address

        await interaction.reply({ content: 'Fetching NFTs.', ephemeral: true });
        const selectedNft = await nftSelector.nftSelector(interaction,walletAddress)
        if(!selectedNft){
            return;
        }

        const followUpMessage = await interaction.followUp({ content: 'Transaction sent, waiting for confirmation.', fetchReply: true, ephemeral: true });
        
        const success = await solPayment.transferSPL(interaction, selectedNft, recipient, targetIsUser,1);

        // Now, to edit the follow-up message, use the `.edit` method on the `followUpMessage`
        if (success && !(success instanceof Error)) {
            await interaction.followUp({ content: 'NFT transfer successful!', ephemeral: true });
            if (target) {
                await interaction.channel.send(`${target} you have been sent an NFT!!!`);
            }
        } else {
            await interaction.followUp({ content: `NFT transfer failed. Please try again. \n ${success}`, ephemeral: true });
        }
    }
}

async function initUserKeypair(targetId) {
    const walletData = await findOneWalletByID('wallet','user_wallets',targetId);
    const userKeyData = await findKeyByID(targetId);
    if (!walletData || !userKeyData) {
        throw new Error("Wallet or key not found");
    }
    const key = Buffer.from(userKeyData.key, 'hex');
    const decryptedSecret = decrypt(key, { iv: walletData.iv, encryptedData: walletData.secretKey });
    return Keypair.fromSecretKey(decryptedSecret);
}