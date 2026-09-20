const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

function main() {
  const envPath = path.join(__dirname, "..", ".env");

  // Create a new random Ethereum-compatible wallet
  const wallet = ethers.Wallet.createRandom();

  // Save private key to contracts/.env (creating or updating PRIVATE_KEY)
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  if (/^PRIVATE_KEY=/m.test(envContent)) {
    envContent = envContent.replace(/^PRIVATE_KEY=.*$/m, `PRIVATE_KEY=${wallet.privateKey}`);
  } else {
    envContent += (envContent.length > 0 && !envContent.endsWith("\n") ? "\n" : "") + `PRIVATE_KEY=${wallet.privateKey}\n`;
  }

  fs.writeFileSync(envPath, envContent, { encoding: "utf-8", mode: 0o600 });

  // Strictly log ONLY the public address — NEVER the private key
  console.log("Public Address:", wallet.address);
}

main();
