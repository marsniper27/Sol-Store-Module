//solPayments.js
require('dotenv').config();
const { SlashCommandBuilder, ButtonBuilder, ButtonStyle,ActionRowBuilder } = require('discord.js');
const fs = require("fs");
const { decrypt} = require ("../encryption.js")
const { findOneWalletByID, findKeyByID } = require('../db');
const bs58 = require('bs58');
const {
    Keypair,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    clusterApiUrl,
    Connection,
    PublicKey
  } = require("@solana/web3.js");


let connection = new Connection(clusterApiUrl("testnet"));

class SolPayment {
    constructor() {
        this.connection = new Connection(clusterApiUrl(process.env.SOLANA_NETWORK));
    }
    async saleNoConfirmation(interaction,lamportAmount){
        try {
            const userKeypair = await this.initUserKeypair(interaction.user.id)
            try {
                const toKey = new PublicKey(process.env.TEAM_WALLET);
                const transaction = await this.createTransaction(userKeypair,lamportAmount,toKey);

                const result = await this.executeTransaction(interaction, transaction, userKeypair, lamportAmount);
                return result;

            } catch (error) {
                // logging the error
                console.error(error);
            
                throw error;
            }

        } catch (e) {
            console.error(e);
            return false;
        }
    };

    async performSale(interaction,lamportAmount){
        try {
            const userKeypair = await this.initUserKeypair(interaction.user.id)
            try {
                const toKey = new PublicKey(process.env.TEAM_WALLET);
                const transaction = await this.createTransaction(userKeypair,lamportAmount,toKey);
                const result = await this.confirmAndExecuteTransaction(interaction, transaction, userKeypair, lamportAmount);
                return result;

            } catch (error) {
                // logging the error
                console.error(error);
            
                throw error;
            }

        } catch (e) {
            console.error(e);
            return false;
        }
    };

    async performTransfer(interaction,lamportAmount,targetUser){
        try {
            const userKeypair = await this.initUserKeypair(interaction.user.id)
            const targetWalletData = await findOneWalletByID(targetUser.id)
            if(!targetWalletData) {
                interaction.reply({ content: `${targetUser.username} does not have a wallet`, ephemeral: true });
                return false;
            }

            try {
                const toKey = new PublicKey(targetWalletData.publicKey);
                const transaction = await this.createTransaction(userKeypair,lamportAmount,toKey);
                const result = await this.confirmAndExecuteTransaction(interaction, transaction, userKeypair, lamportAmount);
                return result;
            } catch (error) {
                // logging the error
                console.error(error);
            
                throw error;
            }

        } catch (e) {
            console.error(e);
            return false;
        }
    };

    async performWithdraw(interaction,lamportAmount,targetWallet){
        try {
            const userKeypair = await this.initUserKeypair(interaction.user.id)
            try {
                const toKey = new PublicKey(targetWallet);
                const transaction = await this.createTransaction(userKeypair,lamportAmount,toKey);
                const result = await this.confirmAndExecuteTransaction(interaction, transaction, userKeypair, lamportAmount);
                return result;
            } catch (error) {
                // logging the error
                console.error(error);
            
                throw error;
            }

        } catch (e) {
            console.error(e);
            return false;
        }
    };

    async initUserKeypair(targetId) {
        const walletData = await findOneWalletByID(targetId);
        const userKeyData = await findKeyByID(targetId);
        if (!walletData || !userKeyData) {
            throw new Error("Wallet or key not found");
        }
        const key = Buffer.from(userKeyData.key, 'hex');
        const decryptedSecret = decrypt(key, { iv: walletData.iv, encryptedData: walletData.secretKey });
        return Keypair.fromSecretKey(decryptedSecret);
    }

    async getKeypair(secret){
        const keyPair = Keypair.fromSecretKey(secret);
        return keyPair;
    };

    async getBalance(feePayer){
        let balance = await connection.getBalance(feePayer.publicKey);
        console.log(`${balance / LAMPORTS_PER_SOL} SOL`);
        return balance;
    };

    async createTransaction(fromKeypair, lamportAmount, toKey){
        
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        let transaction = new Transaction();
        
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromKeypair.publicKey;

        transaction.add(
            SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: toKey,
                lamports: lamportAmount,
            }),
        );

        return transaction;
    };

    async estimateFees(transaction){
        const fees = await transaction.getEstimatedFee(connection);
        return fees;
    };

    async signAndSendTransaction(transaction,keypair){
        try{
            const transactionSignature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
            return transactionSignature;
        }catch(e){
            console.error(e)
            return e
        }
    };

    async confirmAndExecuteTransaction(interaction, transaction, keypair, lamportAmount) {
        const fees = await this.estimateFees(transaction);
        const balance = await this.getBalance(keypair);
        if(balance <= lamportAmount+fees){
            interaction.reply({ content: `You do not have enough SOL for this purchase. Balance: ${balance / LAMPORTS_PER_SOL}SOL`, ephemeral: true });
            return false ;
        }

        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        const response = await interaction.reply({
            content: `Transaction details:\nAmount: ${lamportAmount / LAMPORTS_PER_SOL} SOL\nFees: ${fees / LAMPORTS_PER_SOL} SOL\nTotal: ${(lamportAmount+fees)/LAMPORTS_PER_SOL}\nConfirm transaction?`,
            components: [row],
            ephemeral: true
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });
            if (confirmation.customId === 'confirm') {
                try{
                    await confirmation.update({content: `Creating and sending transaction`, components:[]})
                    const signature = await this.signAndSendTransaction(transaction,keypair);
                    if(!signature){return false}
                    if(signature instanceof Error){
                        await interaction.editReply({ content: `An error occured: \n ${signature}`, components: [] });
                        return false
                    }
                    await interaction.editReply({ content: `${lamportAmount/LAMPORTS_PER_SOL} Sol has been sent, trasnaction signature: ${signature}`, components: [] });
                    return true;
                }catch(error){
                    console.error(error)
                    await interaction.editReply({ content: 'Transaction Failed', components: [] });
                    return false;
                }
            } else if (confirmation.customId === 'cancel') {
                await interaction.editReply({ content: 'Action cancelled', components: [] });
                return false;
            }
        } catch (e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
            return false;
        }

    }

    async executeTransaction(interaction, transaction, keypair, lamportAmount) {
        const fees = await this.estimateFees(transaction);
        const balance = await this.getBalance(keypair);
        if(balance <= lamportAmount+fees){
            interaction.reply({ content: `You do not have enough SOL for this purchase. Balance: ${balance / LAMPORTS_PER_SOL}SOL`, ephemeral: true });
            return false ;
        }

        try {
            await confirmation.update({content: `Creating and sending transaction`, components:[]})
            const signature = await this.signAndSendTransaction(transaction,keypair);
            if(!signature){return false}
            if(signature instanceof Error){
                await interaction.editReply({ content: `An error occured: \n ${signature}`, components: [] });
                return false
            }
            await interaction.editReply({ content: `${lamportAmount/LAMPORTS_PER_SOL} Sol has been sent, trasnaction signature: ${signature}`, components: [] });
            return true;
        }catch(error){
            console.error(error)
            await interaction.editReply({ content: 'Transaction Failed', components: [] });
            return false;
        }
    }
}

module.exports = SolPayment;