// encryption.js
// Nodejs encryption with CTR
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';

function generateKey(){
    const key = crypto.randomBytes(32);
    return key;
}
 
function encrypt(key, secretKey) {
    const iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    // let encrypted = cipher.update(text);
    let encrypted = cipher.update(Buffer.from(secretKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}
 
function decrypt(key,text) {
    let iv = Buffer.from(text.iv, 'hex');
    let encryptedText = Buffer.from(text.encryptedData, 'hex');
    // let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
}

// Export the functions
module.exports = {
    generateKey,
    encrypt,
    decrypt
};