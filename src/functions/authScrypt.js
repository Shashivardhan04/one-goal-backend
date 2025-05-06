const crypto = require('crypto');
const base64url = require('base64url');
const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16; // Should match block length (16 bytes for AES)
const KEYLEN = 256 / 8;

const scryptConfig = {
    algorithm: 'SCRYPT',
    signerKey: Buffer.from('R0MEZMm1Yq0WLP21Go5RFYE2JF7LD2v5C3J4UGNBjutJid+QawrNVzxzV9mtXexRwqgrd8qnHMSW2erxpNipHQ==', 'base64'),
    saltSeparator: Buffer.from('Bw==', 'base64'),
    rounds: 8,
    memCost: 14
};

const base64decode = (encoded) => {
    return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
exports.hashPassword = async (password, salt) => {
    if (!password) throw new Error('Error hashing password: password parameter missing');
    if (!salt) throw new Error('Error hashing password: salt parameter missing');

    return new Promise((resolve, reject) => {
        const saltWithSeparator = Buffer.concat([Buffer.from(salt, 'base64'), scryptConfig.saltSeparator]);
        crypto.scrypt(password, saltWithSeparator, KEYLEN, {
            N: Math.pow(2, scryptConfig.memCost),
            r: scryptConfig.rounds,
            p: 1
        }, (err, derivedKey) => {
            if (err) reject(err);

            try {
                const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, Buffer.alloc(IV_LENGTH, 0));
                let hashedPassword = cipher.update(scryptConfig.signerKey, 'utf8', 'base64');
                hashedPassword += cipher.final('base64');
                resolve(hashedPassword);
            } catch (error) {
                reject(error);
            }
        });
    });
};

exports.verifyPassword = async (password, hash, salt) => {
    if (!password) throw new Error('Error verifying password: password parameter missing');
    if (!salt) throw new Error('Error verifying password: salt parameter missing');
    if (!hash) throw new Error('Error verifying password: hash parameter missing');

    return new Promise((resolve, reject) => {
        const saltWithSeparator = Buffer.concat([Buffer.from(salt, 'base64'), scryptConfig.saltSeparator]);
        crypto.scrypt(password, saltWithSeparator, KEYLEN, {
            N: Math.pow(2, scryptConfig.memCost),
            r: scryptConfig.rounds,
            p: 1
        }, (err, derivedKey) => {
            if (err) reject(err);

            const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, Buffer.alloc(IV_LENGTH, 0));
            let hashedPassword = cipher.update(scryptConfig.signerKey, 'utf8', 'base64');
            hashedPassword += cipher.final('base64');

            const knownHash = Buffer.from(hash, 'base64');
            const generatedHash = Buffer.from(hashedPassword, 'base64');

            const isValid = crypto.timingSafeEqual(knownHash, generatedHash);
            resolve(isValid);
        });
    });
};

exports.generateSalt = (length = 16) => {
    return crypto.randomBytes(length).toString('base64');
}