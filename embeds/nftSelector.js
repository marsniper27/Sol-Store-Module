//nftSelector.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Metaplex, keypairIdentity, bundlrStorage, toMetaplexFileFromBrowser } = require('@metaplex/js');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { findTokenDetails }= require('../utils/fetchWalletAssets');

class NftSelector {
    constructor() {
        this.connection = new Connection(clusterApiUrl(process.env.SOLANA_NETWORK));
    }
    async nftSelector(interaction,walletAddress){
        return new Promise(async (resolve, reject) => {
            const tokens = await findTokenDetails(walletAddress)
            // Filter out NFTs based on specific criteria, e.g., token amount is 1
            const nfts = tokens.filter(token => token.amount === 1 && token.metadata && token.metadata.uri); // Adjust this condition as needed

            // Fetch NFTs from the wallet (This is pseudo-code. You'll need to implement fetching logic based on your requirements and libraries)
            // const nfts = await this.fetchNFTsForWallet(tokens);
            if (nfts.length === 0) {
                // await interaction.reply('No NFTs found in the provided wallet.');
                await interaction.editReply({ content: 'No NFTs found in the provided wallet.', ephemeral: true });
                return;
            }
            let nftCollection = nfts;
            const collections = [...new Set(nfts.map(nft => nft.metadata.symbol))]; // Assume each NFT has a collectionName you can filter by
            const collectionOptions = collections.map((collection, index) => ({
                label: collection,
                description: `Collection ${index + 1}`,
                value: collection,
            }));

            // Simplification: Assume `nfts` is an array of objects with `image` and `name` properties
            let currentIndex = 0; // Start with the first NFT
            const updateNFTView = async (interaction,currentIndex) => {
                const nft = nftCollection[currentIndex];
                let name = nft.metadata.name;
                if(name ==''){name = nft.metadata.symbol}
                const embed = new EmbedBuilder()
                    .setTitle(name)
                    .setImage(nft.metadata.image);
                
                const selectRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_collection')
                        .setPlaceholder('Select a Collection')
                        .addOptions(collectionOptions)
                );

                const buttonRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('previous').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(nftCollection.length === 1 || currentIndex === 0),
                        new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(nftCollection.length === 1 || currentIndex === nftCollection.length - 1),
                        new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
                    );

                await interaction.editReply({ embeds: [embed], components: [selectRow,buttonRow] });
            };

            await updateNFTView(interaction, currentIndex);
            const filter = (i) => ['previous', 'next', 'confirm', 'cancel', 'select_collection'].includes(i.customId) && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 }); // Adjust the timeout as needed

            collector.on('collect', async (i) => {
                switch (i.customId) {
                    case 'select_collection':
                        // Filter NFTs based on the selected collection
                        const selectedCollection = i.values[0];
                        nftCollection = nfts.filter(nft => nft.metadata.symbol === selectedCollection);
                        currentIndex = 0; // Reset to first NFT of selected collection
                        await updateNFTView(interaction, currentIndex);
                        await i.deferUpdate();
                        break;
                    case 'previous':
                        currentIndex = Math.max(0, currentIndex - 1);
                        await updateNFTView(interaction,currentIndex);
                        await i.deferUpdate(); // Acknowledge the button press
                        collector.resetTimer(); // Reset the timeout
                        break;
                    case 'next':
                        currentIndex = Math.min(nfts.length - 1, currentIndex + 1);
                        await updateNFTView(interaction,currentIndex);
                        await i.deferUpdate();
                        collector.resetTimer();
                        break;
                    case 'confirm':
                        const selectedNft = nfts[currentIndex];
                        let name = selectedNft.metadata.name;
                        if(name ==''){name = selectedNft.metadata.symbol}
                        await interaction.editReply({ content: `You've selected: ${name}`, components: [], embeds: [] });
                        collector.stop();
                        resolve(selectedNft.mintAddress);
                        break;
                    case 'cancel':
                        await interaction.editReply({ content: 'Action cancelled', components: [] });
                        collector.stop();
                        reject('User cancelled the action');
                        break;
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ content: 'Interaction timed out.', components: [] });
                    reject('NFT selection timed out or was cancelled');
                }
            });
        })
    }
}

module.exports = NftSelector