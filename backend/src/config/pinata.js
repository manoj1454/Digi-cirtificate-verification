const { PinataSDK } = require('pinata');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const pinataJwt = process.env.PINATA_JWT;
const pinataGateway = process.env.PINATA_GATEWAY;

if (!pinataJwt) {
  console.warn('[Pinata] Warning: PINATA_JWT is not set in environment variables.');
}

/**
 * Clean gateway hostname by stripping protocol, path, and trailing slashes.
 * @param {string} gw
 * @returns {string}
 */
function cleanGatewayDomain(gw) {
  if (!gw) return 'gateway.pinata.cloud';
  return gw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

const gatewayDomain = cleanGatewayDomain(pinataGateway);

const pinata = new PinataSDK({
  pinataJwt: pinataJwt || '',
  pinataGateway: gatewayDomain,
});

/**
 * Builds a working gateway URL from a CID using the configured gateway domain.
 * Supports CIDs with or without 'ipfs://' prefix.
 * @param {string} cid - The IPFS Content Identifier
 * @returns {string} - HTTPS Gateway URL
 */
function getGatewayUrl(cid) {
  if (!cid || typeof cid !== 'string') return '';
  const cleanCid = cid.replace(/^ipfs:\/\//i, '').replace(/\/+$/, '');
  return `https://${gatewayDomain}/ipfs/${cleanCid}`;
}

/**
 * Computes the SHA-256 hash of raw file bytes using Node's crypto module.
 * @param {Buffer} buffer - File buffer
 * @returns {string} - Hex-encoded SHA-256 hash
 */
function computeSha256(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Expected a Buffer to compute SHA-256 hash');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
  pinata,
  gatewayDomain,
  getGatewayUrl,
  computeSha256,
};
