// index.js
const fs = require('fs');
const SolPayment = require('./utils/SolPayment');

const commands = [];
const commandsPath = path.join(__dirname, 'commands','wallets');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));


for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command);
}

module.exports = { commands, SolPayment };
