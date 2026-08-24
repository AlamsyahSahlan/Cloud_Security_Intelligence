const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("SMK Cloud Security - Smart Contract Deployment");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy CertificateRegistry
  console.log("\n[1/2] Deploying CertificateRegistry...");
  const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
  const certificateRegistry = await CertificateRegistry.deploy();
  await certificateRegistry.waitForDeployment();
  const certRegistryAddress = await certificateRegistry.getAddress();
  console.log("  ✅ CertificateRegistry deployed to:", certRegistryAddress);

  // Deploy GradeAuditLog
  console.log("\n[2/2] Deploying GradeAuditLog...");
  const GradeAuditLog = await hre.ethers.getContractFactory("GradeAuditLog");
  const gradeAuditLog = await GradeAuditLog.deploy();
  await gradeAuditLog.waitForDeployment();
  const gradeAuditLogAddress = await gradeAuditLog.getAddress();
  console.log("  ✅ GradeAuditLog deployed to:", gradeAuditLogAddress);

  // Save addresses to JSON
  const addresses = {
    CertificateRegistry: certRegistryAddress,
    GradeAuditLog: gradeAuditLogAddress,
    deployer: deployer.address,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };

  const filePath = path.join(__dirname, "../deployed-addresses.json");
  fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2));
  
  console.log("\n" + "=".repeat(60));
  console.log("Deployment Complete!");
  console.log("Deployed addresses saved to:", filePath);
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  CertificateRegistry:", certRegistryAddress);
  console.log("  GradeAuditLog:      ", gradeAuditLogAddress);
  console.log("\nNext steps:");
  console.log("  1. Update CONTRACT_ADDRESS in backend/.env");
  console.log("  2. Start the backend server: cd ../backend && npm run dev");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
