const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Known Hardhat Account #0 development private key (publicly known)
const DEFAULT_HARDHAT_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const HARDHAT_RAW_HEX = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Checks whether an RPC URL points to localhost / loopback interfaces.
 * @param {string} url
 * @returns {boolean}
 */
function isLocalhostRpc(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.trim().toLowerCase();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('[::1]') ||
    lower.includes('::1')
  );
}

/**
 * Checks whether a given private key is the publicly known Hardhat development key.
 * @param {string} key
 * @returns {boolean}
 */
function isHardhatDevKey(key) {
  if (!key || typeof key !== 'string') return false;
  const cleaned = key.trim().toLowerCase().replace(/^0x/, '');
  return cleaned === HARDHAT_RAW_HEX;
}

/**
 * Validates private key format (64 hex characters, with optional 0x prefix).
 * Rejects common placeholder values. Never logs or exposes the key.
 * @param {string} key
 * @returns {boolean}
 */
function isValidPrivateKeyFormat(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  const upper = trimmed.toUpperCase();
  if (
    upper.includes('YOUR_') ||
    upper.includes('PLACEHOLDER') ||
    upper.includes('EXAMPLE') ||
    upper.includes('0000000000000000000000000000000000000000000000000000000000000000')
  ) {
    return false;
  }
  const cleanHex = trimmed.replace(/^0x/, '');
  return cleanHex.length === 64 && /^[0-9a-fA-F]{64}$/.test(cleanHex);
}

/**
 * Validates blockchain configuration against security policies.
 * Fails startup if production configuration is unsafe.
 * @param {Record<string, string|undefined>} [env]
 * @returns {boolean}
 */
function validateBlockchainConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  const rawKey = env.OPERATOR_PRIVATE_KEY;
  const rpc = env.BLOCKCHAIN_RPC_URL;
  const regAddr = env.REGISTRY_CONTRACT_ADDRESS;
  const certRegAddr = env.CERTIFICATE_REGISTRY_CONTRACT_ADDRESS;

  if (isProd) {
    // 1. Key must be present in production
    if (!rawKey || typeof rawKey !== 'string' || rawKey.trim() === '') {
      throw new Error(
        '[Blockchain Security] Production startup rejected: OPERATOR_PRIVATE_KEY is missing or empty.'
      );
    }

    // 2. Key must not be a placeholder or malformed
    if (!isValidPrivateKeyFormat(rawKey)) {
      throw new Error(
        '[Blockchain Security] Production startup rejected: OPERATOR_PRIVATE_KEY is invalid or contains placeholder values.'
      );
    }

    // 3. Key must not be the known Hardhat development key
    if (isHardhatDevKey(rawKey)) {
      throw new Error(
        '[Blockchain Security] Production startup rejected: Known Hardhat development private key cannot be used in production.'
      );
    }

    // 4. Validate that key can be parsed as a valid wallet without logging secret
    try {
      new ethers.Wallet(rawKey.trim());
    } catch (_) {
      throw new Error(
        '[Blockchain Security] Production startup rejected: OPERATOR_PRIVATE_KEY cannot be parsed as a valid wallet signer.'
      );
    }

    // 5. BLOCKCHAIN_RPC_URL must not point to localhost in production
    if (!rpc || isLocalhostRpc(rpc)) {
      throw new Error(
        '[Blockchain Security] Production startup rejected: BLOCKCHAIN_RPC_URL cannot point to localhost or 127.0.0.1 in production.'
      );
    }

    // 6. Contract addresses must be explicitly configured and valid Ethereum addresses
    if (!regAddr || !ethers.isAddress(regAddr) || regAddr === ethers.ZeroAddress) {
      throw new Error(
        '[Blockchain Security] Production startup rejected: REGISTRY_CONTRACT_ADDRESS is missing or not a valid Ethereum address.'
      );
    }

    if (!certRegAddr || !ethers.isAddress(certRegAddr) || certRegAddr === ethers.ZeroAddress) {
      throw new Error(
        '[Blockchain Security] Production startup rejected: CERTIFICATE_REGISTRY_CONTRACT_ADDRESS is missing or not a valid Ethereum address.'
      );
    }
  }

  return true;
}

const isProduction = process.env.NODE_ENV === 'production';
const isBlockchainExplicitlyRequired =
  process.env.BLOCKCHAIN_ENABLED === 'true' || process.env.REQUIRE_BLOCKCHAIN === 'true';

// Determine operator private key
const rawKey = process.env.OPERATOR_PRIVATE_KEY;
const hasSignerKey = Boolean(
  rawKey &&
  typeof rawKey === 'string' &&
  rawKey.trim() !== '' &&
  !rawKey.includes('YOUR_') &&
  !rawKey.includes('PLACEHOLDER')
);

let isBlockchainConfigured = false;
let isDemoMode = false;

if (isProduction) {
  if (isBlockchainExplicitlyRequired || hasSignerKey) {
    // Production with blockchain enabled or key configured: strictly enforce security policies
    validateBlockchainConfig(process.env);
    isBlockchainConfigured = true;
    isDemoMode = false;
  } else {
    // Production Demo Mode: No signer configured; allow startup safely without crashing
    isBlockchainConfigured = false;
    isDemoMode = true;
    console.log(
      '[Blockchain] Demo Mode active: No production blockchain signer configured (OPERATOR_PRIVATE_KEY is unset). ' +
      'State-changing blockchain transactions are disabled (HTTP 503). ' +
      'Authentication, Neon database operations, and certificate lookups remain fully functional.'
    );
  }
} else {
  // Non-production (development, test)
  isBlockchainConfigured = true;
  isDemoMode = false;
}

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

let operatorPrivateKey = null;

if (isProduction) {
  // Production: strictly use validated rawKey; NEVER fallback or silently substitute
  // In demo mode (isBlockchainConfigured === false), remains null (no Hardhat key or fake key)
  operatorPrivateKey = isBlockchainConfigured && hasSignerKey ? rawKey.trim() : null;
} else {
  // Non-production (development, test)
  if (!rawKey || rawKey.trim() === '' || rawKey.includes('YOUR_')) {
    operatorPrivateKey = DEFAULT_HARDHAT_KEY;
    console.log('[Blockchain] Development mode: Using default Hardhat operator key');
  } else {
    // Explicit key provided in development: validate without silent substitution
    if (!isValidPrivateKeyFormat(rawKey)) {
      console.warn('[Blockchain] Warning: Explicitly provided OPERATOR_PRIVATE_KEY format is invalid.');
    }
    operatorPrivateKey = rawKey.trim();
  }
}

// Resolve RPC provider
const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || (isProduction ? '' : 'http://127.0.0.1:8545');
const isLocalRpc = isLocalhostRpc(rpcUrl);

let provider = null;
if (rpcUrl && (!isProduction || !isLocalRpc)) {
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
  } catch (provErr) {
    console.warn('[Blockchain] Warning: Failed to initialize JsonRpcProvider:', provErr.message);
  }
}

// Initialize signer
let signer = null;
if (operatorPrivateKey && provider) {
  try {
    signer = new ethers.Wallet(operatorPrivateKey, provider);
  } catch (keyErr) {
    if (isProduction) {
      throw new Error('[Blockchain Security] Failed to initialize production wallet signer.');
    } else {
      console.warn('[Blockchain] Warning: Failed to initialize wallet signer in development mode.');
    }
  }
}

// Resolve contract addresses
const registryAddress = isProduction
  ? process.env.REGISTRY_CONTRACT_ADDRESS
  : (isLocalRpc && deploymentData?.contracts?.Registry?.address) ||
    process.env.REGISTRY_CONTRACT_ADDRESS ||
    deploymentData?.contracts?.Registry?.address ||
    '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const certificateRegistryAddress = isProduction
  ? process.env.CERTIFICATE_REGISTRY_CONTRACT_ADDRESS
  : (isLocalRpc && deploymentData?.contracts?.CertificateRegistry?.address) ||
    process.env.CERTIFICATE_REGISTRY_CONTRACT_ADDRESS ||
    deploymentData?.contracts?.CertificateRegistry?.address ||
    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const registryAbi = deploymentData?.contracts?.Registry?.abi || [];
const certificateRegistryAbi = deploymentData?.contracts?.CertificateRegistry?.abi || [];

// Contract instances connected to operator signer or read-only provider
let registryContract = null;
if (registryAddress && registryAbi.length > 0) {
  if (signer) {
    registryContract = new ethers.Contract(registryAddress, registryAbi, signer);
  } else if (provider) {
    registryContract = new ethers.Contract(registryAddress, registryAbi, provider);
  }
}

let certificateRegistryContract = null;
if (certificateRegistryAddress && certificateRegistryAbi.length > 0) {
  if (signer) {
    certificateRegistryContract = new ethers.Contract(certificateRegistryAddress, certificateRegistryAbi, signer);
  } else if (provider) {
    certificateRegistryContract = new ethers.Contract(certificateRegistryAddress, certificateRegistryAbi, provider);
  }
}

/**
 * Setter to inject mock contract instances during unit/integration tests without touching network.
 * @param {{ registry?: any, certificateRegistry?: any, signer?: any, isBlockchainConfigured?: boolean }} instances
 */
function setContractInstancesForTesting(instances = {}) {
  if (instances.registry !== undefined) {
    registryContract = instances.registry;
  }
  if (instances.certificateRegistry !== undefined) {
    certificateRegistryContract = instances.certificateRegistry;
  }
  if (instances.signer !== undefined) {
    signer = instances.signer;
  }
  if (instances.isBlockchainConfigured !== undefined) {
    isBlockchainConfigured = instances.isBlockchainConfigured;
  }
}


/**
 * Validates blockchain prerequisites before performing state-changing transactions.
 */
function validateStateChangingOperation() {
  if (!signer) {
    const err = new Error('Blockchain signer is not initialized. Check OPERATOR_PRIVATE_KEY configuration.');
    err.code = 'BLOCKCHAIN_UNAVAILABLE';
    err.status = 503;
    throw err;
  }
  if (!registryAddress || !ethers.isAddress(registryAddress) || registryAddress === ethers.ZeroAddress) {
    throw new Error('Invalid or unconfigured Registry contract address.');
  }
  if (
    !certificateRegistryAddress ||
    !ethers.isAddress(certificateRegistryAddress) ||
    certificateRegistryAddress === ethers.ZeroAddress
  ) {
    throw new Error('Invalid or unconfigured CertificateRegistry contract address.');
  }
  if (!registryContract || !certificateRegistryContract) {
    throw new Error('Contract instances are not initialized.');
  }
}

/**
 * Fetch the latest on-chain nonce directly from RPC to prevent nonce conflicts.
 */
async function getFreshNonce() {
  if (!signer || !provider) return undefined;
  try {
    const hexNonce = await provider.send('eth_getTransactionCount', [signer.address, 'latest']);
    return parseInt(hexNonce, 16);
  } catch (_) {
    return undefined;
  }
}

/**
 * Checks whether an institution is currently accredited in Registry.sol.
 * Read-only call.
 * @param {string} institutionId
 * @returns {Promise<boolean>}
 */
async function isInstitutionAccreditedOnChain(institutionId) {
  if (!registryContract) return false;
  if (!institutionId || typeof institutionId !== 'string' || institutionId.trim() === '') {
    return false;
  }
  return await registryContract.isAccredited(institutionId.trim());
}

/**
 * Verifies that an institution is registered and accredited in Registry.sol.
 * Fails safely if the institution is not accredited on-chain.
 * Does NOT auto-register or auto-accredit; accreditation requires an explicit authorized regulator action.
 * @param {string} institutionId
 * @returns {Promise<boolean>}
 */
async function ensureInstitutionAccredited(institutionId) {
  if (!registryContract) {
    const err = new Error('Registry contract is not initialized or signer missing.');
    err.code = 'BLOCKCHAIN_UNAVAILABLE';
    err.status = 503;
    throw err;
  }
  if (!institutionId || typeof institutionId !== 'string' || institutionId.trim() === '') {
    throw new Error('Invalid institution ID provided for accreditation check.');
  }

  const isAcc = await isInstitutionAccreditedOnChain(institutionId.trim());
  if (!isAcc) {
    throw new Error(
      `Institution '${institutionId}' is not accredited on-chain. Certificate issuance rejected. Accreditation requires explicit regulator approval.`
    );
  }
  return true;
}

/**
 * Issues a certificate on-chain on CertificateRegistry.sol.
 * Fails safely if the institution is not accredited on-chain.
 * Does NOT auto-accredit or auto-register institutions.
 * @param {string} credentialId
 * @param {string} institutionId
 * @param {string} ipfsCid
 * @returns {Promise<{ txHash: string, blockNumber: number }>}
 */
async function issueCertificateOnChain(credentialId, institutionId, ipfsCid) {
  validateStateChangingOperation();

  if (!credentialId || typeof credentialId !== 'string' || credentialId.trim() === '') {
    throw new Error('Invalid credential ID for on-chain issuance.');
  }
  if (!institutionId || typeof institutionId !== 'string' || institutionId.trim() === '') {
    throw new Error('Invalid institution ID for on-chain issuance.');
  }
  if (!ipfsCid || typeof ipfsCid !== 'string' || ipfsCid.trim() === '') {
    throw new Error('Invalid IPFS CID for on-chain issuance.');
  }

  // 1. Enforce that institution is already accredited on-chain (fails safely if not)
  await ensureInstitutionAccredited(institutionId.trim());

  // 2. Issue certificate on CertificateRegistry
  const nonce = await getFreshNonce();
  const tx = await certificateRegistryContract.issueCertificate(
    credentialId.trim(),
    institutionId.trim(),
    ipfsCid.trim(),
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
    const err = new Error('CertificateRegistry contract is not initialized.');
    err.code = 'BLOCKCHAIN_UNAVAILABLE';
    err.status = 503;
    throw err;
  }
  if (!credentialId || typeof credentialId !== 'string' || credentialId.trim() === '') {
    throw new Error('Invalid credential ID for on-chain verification.');
  }

  const cert = await certificateRegistryContract.verifyCertificate(credentialId.trim());
  return {
    ipfsHash: cert[0],
    revoked: Boolean(cert[1]),
    institutionId: cert[2],
    isInstituteAccredited: Boolean(cert[3]),
  };
}

/**
 * Registers a new institution on Registry.sol.
 * Requires OPERATOR_ROLE.
 * @param {string} institutionId
 * @param {string} name
 */
async function addInstitutionOnChain(institutionId, name) {
  validateStateChangingOperation();

  if (!institutionId || typeof institutionId !== 'string' || institutionId.trim() === '') {
    throw new Error('Invalid institution ID for registration.');
  }
  const instName = name || `Institution ${institutionId}`;
  const nonce = await getFreshNonce();
  const tx = await registryContract.addInstitute(institutionId.trim(), instName.trim(), { nonce });
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Updates accreditation status of an institution on Registry.sol.
 * Requires OPERATOR_ROLE.
 * @param {string} institutionId
 * @param {boolean} accredited
 */
async function updateAccreditationStatusOnChain(institutionId, accredited) {
  validateStateChangingOperation();

  if (!institutionId || typeof institutionId !== 'string' || institutionId.trim() === '') {
    throw new Error('Invalid institution ID for accreditation update.');
  }
  const nonce = await getFreshNonce();
  const tx = await registryContract.updateAccreditationStatus(
    institutionId.trim(),
    Boolean(accredited),
    { nonce }
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Revokes an issued certificate on-chain on CertificateRegistry.sol.
 * Requires OPERATOR_ROLE.
 * @param {string} credentialId
 */
async function revokeCertificateOnChain(credentialId) {
  validateStateChangingOperation();

  if (!credentialId || typeof credentialId !== 'string' || credentialId.trim() === '') {
    throw new Error('Invalid credential ID for revocation.');
  }
  const nonce = await getFreshNonce();
  const tx = await certificateRegistryContract.revokeCertificate(credentialId.trim(), { nonce });
  const receipt = await tx.wait();

  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

module.exports = {

  registryAddress,
  certificateRegistryAddress,
  DEFAULT_HARDHAT_KEY,
  isLocalhostRpc,
  isHardhatDevKey,
  isValidPrivateKeyFormat,
  validateBlockchainConfig,
  validateStateChangingOperation,
  setContractInstancesForTesting,
  ensureInstitutionAccredited,
  addInstitutionOnChain,
  updateAccreditationStatusOnChain,
  isInstitutionAccreditedOnChain,
  issueCertificateOnChain,
  verifyCertificateOnChain,
  revokeCertificateOnChain,
  isBlockchainReady: () => Boolean(isBlockchainConfigured && signer),
  rpcUrl,
};

Object.defineProperties(module.exports, {
  signer: {
    get: () => signer,
    set: (val) => { signer = val; },
    enumerable: true,
    configurable: true,
  },
  registryContract: {
    get: () => registryContract,
    set: (val) => { registryContract = val; },
    enumerable: true,
    configurable: true,
  },
  certificateRegistryContract: {
    get: () => certificateRegistryContract,
    set: (val) => { certificateRegistryContract = val; },
    enumerable: true,
    configurable: true,
  },
  isBlockchainConfigured: {
    get: () => isBlockchainConfigured,
    set: (val) => { isBlockchainConfigured = val; },
    enumerable: true,
    configurable: true,
  },
  isDemoMode: {
    get: () => isDemoMode,
    set: (val) => { isDemoMode = val; },
    enumerable: true,
    configurable: true,
  },
  provider: {
    get: () => provider,
    set: (val) => { provider = val; },
    enumerable: true,
    configurable: true,
  },
});



