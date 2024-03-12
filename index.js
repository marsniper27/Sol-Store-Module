// index.js
const fs = require('fs');
const path = require('node:path');
const SolPayment = require('./utils/solPayment');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
// const commandsPath = path.join(__dirname, 'commands','wallets');
// const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));


for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath,folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        commands.push(command);
    }
}

module.exports = { commands, SolPayment };
