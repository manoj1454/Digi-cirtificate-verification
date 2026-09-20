const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==================================================");
  console.log("Deploying Smart Contracts to network:", network.name);
  console.log("Deployer Address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");
  console.log("==================================================");

  // 1. Deploy Registry contract
  console.log("1. Deploying Registry.sol...");
  const RegistryFactory = await ethers.getContractFactory("Registry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("   Registry deployed at:", registryAddress);

  // 2. Deploy CertificateRegistry contract with Registry address
  console.log("2. Deploying CertificateRegistry.sol...");
  const CertificateRegistryFactory = await ethers.getContractFactory("CertificateRegistry");
  const certificateRegistry = await CertificateRegistryFactory.deploy(registryAddress);
  await certificateRegistry.waitForDeployment();
  const certificateRegistryAddress = await certificateRegistry.getAddress();
  console.log("   CertificateRegistry deployed at:", certificateRegistryAddress);

  // 3. Obtain contract artifacts for ABI
  const RegistryArtifact = await hre.artifacts.readArtifact("Registry");
  const CertificateRegistryArtifact = await hre.artifacts.readArtifact("CertificateRegistry");

  // 4. Prepare deployment payload
  const currentNetwork = await ethers.provider.getNetwork();
  const deploymentData = {
    network: {
      name: network.name,
      chainId: Number(currentNetwork.chainId),
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      Registry: {
        address: registryAddress,
        abi: RegistryArtifact.abi,
      },
      CertificateRegistry: {
        address: certificateRegistryAddress,
        abi: CertificateRegistryArtifact.abi,
      },
    },
  };

  // 5. Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save to target filename (e.g. local.json for localhost / hardhat, or network name)
  const targetFileName = network.name === "localhost" || network.name === "hardhat"
    ? "local.json"
    : `${network.name}.json`;

  const deploymentPath = path.join(deploymentsDir, targetFileName);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2), "utf-8");

  console.log("==================================================");
  console.log(`Deployment metadata and ABIs saved to:\n${deploymentPath}`);
  console.log("==================================================");

  return { registryAddress, certificateRegistryAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
