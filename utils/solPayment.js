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

  const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction,createAssociatedTokenAccountInstruction,ASSOCIATED_TOKEN_PROGRAM_ID  } = require('@solana/spl-token');

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
            const targetWalletData = await findOneWalletByID('wallet','user_wallets',targetUser.id)
            if(!targetWalletData) {
                await interaction.reply({ content: `${targetUser.username} does not have a wallet`, ephemeral: true });
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

    async transferSPL (interaction, mintAddress, targetUser, targetIsUser, amount) {
        try {
            // Initialize sender and receiver's public keys
            const senderKeypair = await this.initUserKeypair(interaction.user.id);
            let receiverPublicKey = null;
            if(targetIsUser){
                const targetWalletData = await findOneWalletByID('wallet','user_wallets',targetUser.id);
                receiverPublicKey = new PublicKey(targetWalletData.publicKey);
            }
            else{
                receiverPublicKey = new PublicKey(targetUser);
            }
            
            // Mint address of the SPL Token
            const mintPublicKey = new PublicKey(mintAddress);
        
            // Perform the SPL Token transfer
            const result = await this.transferSPLToken(senderKeypair, receiverPublicKey, amount, mintPublicKey);
            
            if (result && !(result instanceof Error)) {
                console.log('SPL Token transfer successful');
                return result;
                // Respond to the interaction accordingly
            } else {
                console.error('SPL Token transfer failed');
                return result;
                // Respond to the interaction accordingly
            }
            } catch (error) {
                console.error('Transfer SPL Token failed:', error);
                // Respond to the interaction with error information
            }
    }

    async initUserKeypair(targetId) {
        const walletData = await findOneWalletByID('wallet','user_wallets',targetId);
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
            await interaction.reply({ content: `You do not have enough SOL for this purchase. Balance: ${balance / LAMPORTS_PER_SOL}SOL`, ephemeral: true });
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
            await interaction.reply({ content: `You do not have enough SOL for this purchase. Balance: ${balance / LAMPORTS_PER_SOL}SOL`, ephemeral: true });
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

    async transferSPLToken(senderKeypair, receiverPublicKey, amount, mintAddress) {
        try {
            // Get the sender's associated token account for the SPL token
            const senderTokenAccountAddress = await getAssociatedTokenAddress(
                mintAddress,
                senderKeypair.publicKey,
                false,
                TOKEN_PROGRAM_ID // Ensure this is a PublicKey
            );

            const tokenAmount = await this.checkSPLTokenBalance(senderTokenAccountAddress,mintAddress)

            if(tokenAmount < amount){
                console.log("Insufficient token balance for transfer.");
                return false;
            }
    
            // Get or create the receiver's associated token account
            const receiverTokenAccountAddress = await getAssociatedTokenAddress(
                mintAddress,
                receiverPublicKey,
                true, // Create if it does not exist
                TOKEN_PROGRAM_ID // Ensure this is a PublicKey
            );

            // Check if the receiver's associated token account needs to be created
            const receiverAccountInfo = await this.connection.getAccountInfo(receiverTokenAccountAddress);

            const transaction = new Transaction();
            if (!receiverAccountInfo) {
                // Add instruction to create the receiver's associated token account
                const createAccountInstruction = createAssociatedTokenAccountInstruction(
                    senderKeypair.publicKey, // payer
                    receiverTokenAccountAddress, // associated token account address
                    receiverPublicKey, // account owner
                    mintAddress, // mint address
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                );
                transaction.add(createAccountInstruction);
                console.log('Created reciever Associated Token Account')
            }

            // Create the transfer instruction
            const transferInstruction = createTransferInstruction(
                senderTokenAccountAddress, // sender token account
                receiverTokenAccountAddress, // receiver token account
                senderKeypair.publicKey, // authority (owner of the sender account)
                amount, // amount
                [],
                TOKEN_PROGRAM_ID
            );
    
            transaction.add(transferInstruction);
            console.log('transaction created');
            // Create and sign a transaction
            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [senderKeypair] // signers
            );
    
            console.log("Transfer successful! Signature:", signature);
            return signature;
        } catch (error) {
            console.error("Transfer failed:", error);
            return error;
        }
    }
    async checkSPLTokenBalance(tokenAccountAddress) {
        // Fetch parsed information of the token account
        const accountInfo = await this.connection.getParsedAccountInfo(tokenAccountAddress);
        if (accountInfo.value) {
            // Extract the UI amount (the amount user sees) from the account info
            const tokenAmount = accountInfo.value.data.parsed.info.tokenAmount.uiAmount;
            console.log(`Token balance: ${tokenAmount}`);
            return tokenAmount;
        } else {
            console.log("Token account not found or not initialized.");
            return 0;
        }
    }
}

module.exports = SolPayment;