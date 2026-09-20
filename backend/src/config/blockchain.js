const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Load local deployment artifacts (addresses & ABIs)
let deploymentData = null;
const localDeploymentPath = path.resolve(__dirname, '../../../contracts/deployments/local.json');

try {
  if (fs.existsSync(localDeploymentPath)) {
    deploymentData = JSON.parse(fs.readFileSync(localDeploymentPath, 'utf-8'));
  }
} catch (e) {
  console.warn('[Blockchain] Warning: Failed to load local.json deployment:', e.message);
}

const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
// Default to standard Hardhat Account #0 private key if not explicitly set
const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

if (!process.env.OPERATOR_PRIVATE_KEY) {
  console.log('[Blockchain] Using default Hardhat operator key');
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = operatorPrivateKey ? new ethers.Wallet(operatorPrivateKey, provider) : null;

// Resolve contract addresses: prefer freshly deployed local addresses if on local node
const isLocalRpc = (!rpcUrl || rpcUrl.includes('127.0.0.1') || rpcUrl.includes('localhost'));

const registryAddress =
  (isLocalRpc && deploymentData?.contracts?.Registry?.address) ||
  process.env.REGISTRY_CONTRACT_ADDRESS ||
  deploymentData?.contracts?.Registry?.address ||
  '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const certificateRegistryAddress =
  (isLocalRpc && deploymentData?.contracts?.CertificateRegistry?.address) ||
  process.env.CERTIFICATE_REGISTRY_CONTRACT_ADDRESS ||
  deploymentData?.contracts?.CertificateRegistry?.address ||
  '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const registryAbi = deploymentData?.contracts?.Registry?.abi || [];
const certificateRegistryAbi = deploymentData?.contracts?.CertificateRegistry?.abi || [];

// Contract instances connected to operator signer
const registryContract = signer && registryAbi.length > 0
  ? new ethers.Contract(registryAddress, registryAbi, signer)
  : null;

const certificateRegistryContract = signer && certificateRegistryAbi.length > 0
  ? new ethers.Contract(certificateRegistryAddress, certificateRegistryAbi, signer)
  : null;

/**
 * Fetch the latest on-chain nonce directly from RPC to prevent nonce conflicts.
 */
async function getFreshNonce() {
  if (!signer) return undefined;
  const hexNonce = await provider.send('eth_getTransactionCount', [signer.address, 'latest']);
  return parseInt(hexNonce, 16);
}

/**
 * Ensures an institution is registered and accredited in Registry.sol.
 * If not already registered, adds it using OPERATOR_ROLE.
 * @param {string} institutionId
 * @param {string} [institutionName]
 */
async function ensureInstitutionAccredited(institutionId, institutionName) {
  if (!registryContract) {
    throw new Error('Registry contract is not initialized or signer missing.');
  }

  const isAcc = await registryContract.isAccredited(institutionId);
  if (isAcc) {
    return true;
  }

  // Not accredited or doesn't exist yet -> register institution
  const name = institutionName || `Institution ${institutionId}`;
  const nonce = await getFreshNonce();
  const tx = await registryContract.addInstitute(institutionId, name, { nonce });
  await tx.wait();
  return true;
}

/**
 * Issues a certificate on-chain on CertificateRegistry.sol.
 * @param {string} credentialId
 * @param {string} institutionId
 * @param {string} ipfsCid
 * @param {string} [institutionName]
 * @returns {Promise<{ txHash: string, blockNumber: number }>}
 */
async function issueCertificateOnChain(credentialId, institutionId, ipfsCid, institutionName) {
  if (!certificateRegistryContract) {
    throw new Error('CertificateRegistry contract is not initialized or signer missing.');
  }

  // 1. Ensure institution is accredited in Registry contract
  await ensureInstitutionAccredited(institutionId, institutionName);

  // 2. Issue certificate on CertificateRegistry
  const nonce = await getFreshNonce();
  const tx = await certificateRegistryContract.issueCertificate(
    credentialId,
    institutionId,
    ipfsCid,
    { nonce }
  );

  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Read-only on-chain certificate verification call.
 * Free, read-only, no gas cost.
 * @param {string} credentialId
 * @returns {Promise<{ ipfsHash: string, revoked: boolean, institutionId: string, isInstituteAccredited: boolean }>}
 */
async function verifyCertificateOnChain(credentialId) {
  if (!certificateRegistryContract) {
    throw new Error('CertificateRegistry contract is not initialized.');
  }

  const cert = await certificateRegistryContract.verifyCertificate(credentialId);
  return {
    ipfsHash: cert[0],
    revoked: Boolean(cert[1]),
    institutionId: cert[2],
    isInstituteAccredited: Boolean(cert[3]),
  };
}

/**
 * Registers a new institution on Registry.sol
 * @param {string} institutionId
 * @param {string} name
 */
async function addInstitutionOnChain(institutionId, name) {
  if (!registryContract) {
    throw new Error('Registry contract is not initialized.');
  }
  const nonce = await getFreshNonce();
  const tx = await registryContract.addInstitute(institutionId, name, { nonce });
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Updates accreditation status of an institution on Registry.sol
 * @param {string} institutionId
 * @param {boolean} accredited
 */
async function updateAccreditationStatusOnChain(institutionId, accredited) {
  if (!registryContract) {
    throw new Error('Registry contract is not initialized.');
  }
  const nonce = await getFreshNonce();
  const tx = await registryContract.updateAccreditationStatus(institutionId, Boolean(accredited), { nonce });
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Checks if institution is accredited on-chain
 * @param {string} institutionId
 */
async function isInstitutionAccreditedOnChain(institutionId) {
  if (!registryContract) return false;
  return await registryContract.isAccredited(institutionId);
}

/**
 * Revokes an issued certificate on-chain on CertificateRegistry.sol
 * @param {string} credentialId
 */
async function revokeCertificateOnChain(credentialId) {
  if (!certificateRegistryContract) {
    throw new Error('CertificateRegistry contract is not initialized.');
  }
  const nonce = await getFreshNonce();
  const tx = await certificateRegistryContract.revokeCertificate(credentialId, { nonce });
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

module.exports = {
  provider,
  signer,
  registryContract,
  certificateRegistryContract,
  registryAddress,
  certificateRegistryAddress,
  ensureInstitutionAccredited,
  addInstitutionOnChain,
  updateAccreditationStatusOnChain,
  isInstitutionAccreditedOnChain,
  issueCertificateOnChain,
  verifyCertificateOnChain,
  revokeCertificateOnChain,
};
