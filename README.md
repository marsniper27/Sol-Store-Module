# Sol-Store-Module
Sol Store Module

The Sol Store Module facilitates the integration of Solana blockchain functionalities into Discord bots, with a focus on wallet management and SOL-based transactions. It leverages MongoDB to securely store user wallet information and includes slash commands for wallet creation, address retrieval, and secret key extraction, enabling users to export their wallets. Additionally, it features a purchasing component designed for seamless integration into various store systems.


## Environment Setup

To get started, add the following variables to your `.env` file:

```plaintext
CLIENT_ID=YOUR_CLIENT_ID
GUILD_ID=YOUR_GUILD_ID
MONGO_PASSWORD=YOUR_MONGO_PASSWORD
MONGO_DB_ADDRESS=YOUR_MONGO_DB_ADDRESS
MONGO_DB_NAME=YOUR_MONGO_DB_NAME
MONGO_DB_COLLECTION=YOUR_MONGO_DB_COLLECTION
TEAM_WALLET=YOUR_TEAM_WALLET_ADDRESS
```
`MONGO_DB_NAME` specifies the database name where user data will be stored
`MONGO_DB_COLLECTION` indicates the collection name for storing wallet information.

## Installation
### Via npm
If the module is published on npm:

```bash
npm install Sol-Store-Module
```
### For Local Development
To use the module locally, for example, during development:

```bash
npm link /path/to/Sol-Store-Module
```
## Usage

This basic example demonstrates how to incorporate the Sol-Store-Module into your Discord bot to handle commands and execute the SolPayment functionality:

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { commands } = require('Sol-Store-Module');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = commands.find(cmd => cmd.data.name === interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
  }
});

client.login(DISCORD_TOKEN);
```

Remember to set DISCORD_TOKEN in your .env to your bot's token.

## Notes

- The MongoDB connection for managing wallet data is configured internally, simplifying the integration process.
- Implement robust error handling to improve your bot's resilience and user experience.
- Given the critical nature of financial transactions, ensure your deployment environment is secure.

## Contributing

We welcome contributions to the Sol-Store-Module! Feel free to fork the repository, make changes, and submit a pull request. For significant changes, please open an issue first to discuss what you'd like to change.

Remember to update tests as needed.