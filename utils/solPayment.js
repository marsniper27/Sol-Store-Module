//PurchaseItems.js
require('dotenv').config();
const { SlashCommandBuilder, ButtonBuilder, ButtonStyle,ActionRowBuilder } = require('discord.js');
const fs = require("fs");
const { client } = require("../../db.js");
const { decrypt} = require ("../../encryption.js")
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
    constructor(dbClient) {
        this.client = dbClient;
        this.connection = new Connection(clusterApiUrl(process.env.SOLANA_NETWORK));
    }

    async performSale(interaction,lamportAmount){
        const target = interaction.options.getUser('user') ?? interaction.user;
        const targetId = target.id;
        try {
            // Connect to the MongoDB cluster
            await client.connect();
            // await interaction.reply({ content: `Fetching Wallet`, ephemeral: true });
            const walletData = await findOneWalletByID(client,target.id)
            if(!walletData) {
                interaction.reply({ content: `You do not have a wallet`, ephemeral: true });
                return;
            }

            try {
                // reading a JSON file synchronously
                // const jsonData = fs.readFileSync("user.json");
                // const users = JSON.parse(jsonData);
                // const user = users[targetId];
                // const key = Buffer.from(user[0].key.toString(), 'hex')
                const userKey = await findKeyByID(targetId)
                const key = Buffer.from(userKey.toString(), 'hex')
            
                const decryptedSecret = decrypt(key,{iv:walletData.iv,encryptedData:walletData.secretKey});
                const userKeypair = await getKeypair(decryptedSecret);
                const balance = await getBalance(userKeypair);
                    if(balance <= lamportAmount+10000){
                    interaction.reply({ content: `You do not have enough SOL for thsi purchase. Balance: ${balance / LAMPORTS_PER_SOL}SOL`, ephemeral: true });
                    return;
                }
                const transaction = await createTransaction(userKeypair,lamportAmount);
                const fees = await estimateFees(transaction);
                
                const confirm = new ButtonBuilder()
                    .setCustomId('confirm')
                    .setLabel('Confirm Purchase')
                    .setStyle(ButtonStyle.Danger);

                const cancel = new ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                
                const row = new ActionRowBuilder()
                .addComponents(cancel, confirm);

                const response = await interaction.reply({ content: `Please confrim transaction. Cost : ${lamportAmount/LAMPORTS_PER_SOL} SOL, Fees: ${fees/LAMPORTS_PER_SOL} SOL, Total : ${(lamportAmount+fees)/LAMPORTS_PER_SOL} SOL`,
                components: [row], ephemeral: true });

                const collectorFilter = i => i.user.id === interaction.user.id;

                try {
                    const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });
                    if (confirmation.customId === 'confirm') {
                        try{
                            await confirmation.update({content: `Creating and sending transaction`, components:[]})
                            const signature = await signAndSendTransaction(transaction,userKeypair);
                            // await confirmation.update({ content: `100 Sol has been sent, trasnaction signature: ${signature}`, components: [] });
                        
                            await interaction.editReply({ content: `${lamportAmount/LAMPORTS_PER_SOL} Sol has been sent, trasnaction signature: ${signature}`, components: [] });
                        }catch(error){
                            console.error(error)
                            await interaction.editReply({ content: 'Transaction Failed', components: [] });
                        }
                    } else if (confirmation.customId === 'cancel') {
                        // await confirmation.update({ content: 'Action cancelled', components: [] });
                        await interaction.editReply({ content: 'Action cancelled', components: [] });
                    }
                } catch (e) {
                    await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
                }

            } catch (error) {
                // logging the error
                console.error(error);
            
                throw error;
            }

        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    };

    async findOneWalletByID(client, id) {
        const result = await client.db("wallets").collection("user_wallets").findOne({ _id: id });
        if (result) {
            console.log(`Found a wallet in the collection for user with the id '${id}':`);
            return result;
        } else {
            console.log(`No wallet found for user with the name '${id}'`);
            return false;
        }
    };

    
    async findKeyByID(client, id) {
        const result = await client.db(process.env.MONGO_DB_NAME).collection('keys').findOne({ _id: id });
        if (result) {
            console.log(`Found a key in the collection for user with the id '${id}':`);
            return result;
        } else {
            console.log(`No wallet found for user with the name '${id}'`);
            return false;
        }
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

    async createTransaction(fromKeypair, lamportAmount){
        const toKeypair = Keypair.fromSecretKey(
            bs58.decode(
            "5QDamE6PZQKcFXyvTmKfCqMzdpa97TH5pq4GoYe4zjUXmChXRz3QbpvgVNPph2hyocQkjNMhgYb4WQoXngnowiRM"
            )
        );
        // const toKey = new PublicKey(
        //       "F1p5ct9NqBP63Zrf2QBFn1MAGTNNiRG6BRkmm4g5vCUS"
        //     );
        const toKey = new PublicKey(
                "5V8M3JYmJqPaXWYjFpkQ2QeacwKQ4SFiNN8WCykjAa55"
            );
        
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
        // const message = await transaction.compileMessage();
        const fees = await transaction.getEstimatedFee(connection);
        // const fees = await connection.getFeeForMessage(
        //     transaction.compileMessage(),
        //     'confirmed'
        //   );
        return fees;
    };

    async signAndSendTransaction(transaction,keypair){
        try{
            const transactionSignature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
            return transactionSignature;
        }catch(e){
            console.error(e)
        }
    };
}

module.exports = SolPayment;