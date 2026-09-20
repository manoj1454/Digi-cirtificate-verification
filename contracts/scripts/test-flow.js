const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function main() {
  console.log("==================================================");
  console.log("Running Full Lifecycle Flow on Network:", network.name);
  console.log("==================================================");

  // 1. Load deployment metadata
  const deploymentPath = path.join(__dirname, "..", "deployments", "local.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found at: ${deploymentPath}. Please run deploy first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const [signer] = await ethers.getSigners();
  console.log("Signer / Operator Address:", signer.address);
  console.log("Registry Address:", deployment.contracts.Registry.address);
  console.log("CertificateRegistry Address:", deployment.contracts.CertificateRegistry.address);
  console.log("--------------------------------------------------");

  // 2. Instantiate contracts
  const registry = new ethers.Contract(
    deployment.contracts.Registry.address,
    deployment.contracts.Registry.abi,
    signer
  );

  const certRegistry = new ethers.Contract(
    deployment.contracts.CertificateRegistry.address,
    deployment.contracts.CertificateRegistry.abi,
    signer
  );

  const runId = Date.now().toString().slice(-6);
  const testInstId = `inst-local-${runId}`;
  const testInstName = `Metropolis Institute of Tech #${runId}`;
  const testCredId = `cred-local-${runId}`;
  const testIpfsHash = `ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi-${runId}`;

  // Step 1: Add institute
  console.log(`[Step 1] Adding Institution: ID=${testInstId}, Name="${testInstName}"...`);
  const addInstTx = await registry.addInstitute(testInstId, testInstName);
  const addInstReceipt = await addInstTx.wait();
  console.log(`   Transaction confirmed (hash: ${addInstReceipt.hash})`);

  const isAccreditedInitial = await registry.isAccredited(testInstId);
  console.log(`   Accredited status in Registry:`, isAccreditedInitial);
  assert(isAccreditedInitial === true, "Institution should be accredited upon registration");
  console.log("   ✔ Step 1 Passed: Institution added and verified accredited.\n");

  // Step 2: Issue Certificate
  console.log(`[Step 2] Issuing Certificate: CredentialID=${testCredId} for Institute=${testInstId}...`);
  const issueTx = await certRegistry.issueCertificate(testCredId, testInstId, testIpfsHash);
  const issueReceipt = await issueTx.wait();
  console.log(`   Transaction confirmed (hash: ${issueReceipt.hash})`);
  console.log("   ✔ Step 2 Passed: Certificate successfully issued on-chain.\n");

  // Step 3: Verify Certificate
  console.log(`[Step 3] Verifying Certificate: ${testCredId}...`);
  let cert = await certRegistry.verifyCertificate(testCredId);
  console.log("   verifyCertificate() output:", {
    ipfsHash: cert[0],
    revoked: cert[1],
    institutionId: cert[2],
    isInstituteAccredited: cert[3],
  });

  assert(cert[0] === testIpfsHash, "IPFS hash does not match expected");
  assert(cert[1] === false, "Certificate must not be revoked initially");
  assert(cert[2] === testInstId, "Institution ID does not match");
  assert(cert[3] === true, "Institution should be accredited");
  console.log("   ✔ Step 3 Passed: Certificate verification confirmed valid.\n");

  // Step 4: De-accredit Institute & Re-verify Certificate
  console.log(`[Step 4a] Updating accreditation for ${testInstId} to FALSE...`);
  const deaccreditTx = await registry.updateAccreditationStatus(testInstId, false);
  await deaccreditTx.wait();

  const isAccreditedAfterRevoke = await registry.isAccredited(testInstId);
  console.log(`   Registry isAccredited(${testInstId}):`, isAccreditedAfterRevoke);
  assert(isAccreditedAfterRevoke === false, "Institute should now be unaccredited");

  console.log(`[Step 4b] Re-verifying Certificate ${testCredId} after institute accreditation change...`);
  cert = await certRegistry.verifyCertificate(testCredId);
  console.log("   verifyCertificate() output:", {
    ipfsHash: cert[0],
    revoked: cert[1],
    institutionId: cert[2],
    isInstituteAccredited: cert[3],
  });

  assert(cert[3] === false, "CertificateRegistry should dynamically report isInstituteAccredited = false");
  assert(cert[1] === false, "Certificate itself should still NOT be revoked");
  assert(cert[0] === testIpfsHash, "Certificate IPFS hash should remain intact");
  console.log("   ✔ Step 4b Passed: Live dynamic accreditation status change confirmed.\n");

  // Step 4c: Restore accreditation
  console.log(`[Step 4c] Restoring accreditation for ${testInstId} to TRUE...`);
  const reaccreditTx = await registry.updateAccreditationStatus(testInstId, true);
  await reaccreditTx.wait();

  cert = await certRegistry.verifyCertificate(testCredId);
  assert(cert[3] === true, "isInstituteAccredited should be true again");
  console.log("   ✔ Step 4c Passed: Restored accreditation verified.\n");

  // Step 5: Revoke Certificate
  console.log(`[Step 5] Revoking Certificate: ${testCredId}...`);
  const revokeTx = await certRegistry.revokeCertificate(testCredId);
  const revokeReceipt = await revokeTx.wait();
  console.log(`   Transaction confirmed (hash: ${revokeReceipt.hash})`);

  cert = await certRegistry.verifyCertificate(testCredId);
  console.log("   verifyCertificate() output after revocation:", {
    ipfsHash: cert[0],
    revoked: cert[1],
    institutionId: cert[2],
    isInstituteAccredited: cert[3],
  });

  assert(cert[1] === true, "Certificate must now have revoked = true");
  assert(cert[3] === true, "Institution is still accredited");
  assert(cert[0] === testIpfsHash, "IPFS hash remains intact for auditability");
  console.log("   ✔ Step 5 Passed: Certificate revocation confirmed.\n");

  console.log("==================================================");
  console.log("🎉 ALL LIFECYCLE CHECKS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test flow failed:", error);
    process.exit(1);
  });
