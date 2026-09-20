const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Certificate Verification Platform Smart Contracts", function () {
  let Registry;
  let CertificateRegistry;
  let registry;
  let certificateRegistry;
  let deployer; // acts as backend server wallet with OPERATOR_ROLE
  let unauthorizedUser;

  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  const INST_ID = "inst-oxford-001";
  const INST_NAME = "Oxford University";
  const CRED_ID = "cred-degree-2026-999";
  const IPFS_HASH = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

  beforeEach(async function () {
    [deployer, unauthorizedUser] = await ethers.getSigners();

    // Deploy Registry
    Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    // Deploy CertificateRegistry with Registry address
    CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    certificateRegistry = await CertificateRegistry.deploy(await registry.getAddress());
    await certificateRegistry.waitForDeployment();
  });

  describe("Registry.sol", function () {
    it("should grant OPERATOR_ROLE and DEFAULT_ADMIN_ROLE to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await registry.hasRole(OPERATOR_ROLE, deployer.address)).to.be.true;
      expect(await registry.hasRole(OPERATOR_ROLE, unauthorizedUser.address)).to.be.false;
    });

    describe("addInstitute", function () {
      it("should successfully add an institution with accredited = true by default", async function () {
        await expect(registry.connect(deployer).addInstitute(INST_ID, INST_NAME))
          .to.emit(registry, "InstitutionAdded")
          .withArgs(INST_ID, INST_ID, INST_NAME);

        expect(await registry.isAccredited(INST_ID)).to.be.true;
      });

      it("should revert if a non-operator attempts to add an institution", async function () {
        await expect(
          registry.connect(unauthorizedUser).addInstitute(INST_ID, INST_NAME)
        ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
      });

      it("should revert if institution ID is empty", async function () {
        await expect(
          registry.connect(deployer).addInstitute("", INST_NAME)
        ).to.be.revertedWith("Invalid institution ID");
      });

      it("should revert if institution already exists", async function () {
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);
        await expect(
          registry.connect(deployer).addInstitute(INST_ID, "Duplicate University")
        ).to.be.revertedWith("Institution already exists");
      });
    });

    describe("updateAccreditationStatus", function () {
      beforeEach(async function () {
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);
      });

      it("should allow operator to flip accreditation status to false and back to true", async function () {
        // Revoke accreditation
        await expect(registry.connect(deployer).updateAccreditationStatus(INST_ID, false))
          .to.emit(registry, "AccreditationUpdated")
          .withArgs(INST_ID, INST_ID, false);
        expect(await registry.isAccredited(INST_ID)).to.be.false;

        // Re-accredit
        await expect(registry.connect(deployer).updateAccreditationStatus(INST_ID, true))
          .to.emit(registry, "AccreditationUpdated")
          .withArgs(INST_ID, INST_ID, true);
        expect(await registry.isAccredited(INST_ID)).to.be.true;
      });

      it("should revert if non-operator attempts to update accreditation status", async function () {
        await expect(
          registry.connect(unauthorizedUser).updateAccreditationStatus(INST_ID, false)
        ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
      });

      it("should revert if updating a non-existent institution", async function () {
        await expect(
          registry.connect(deployer).updateAccreditationStatus("non-existent-id", false)
        ).to.be.revertedWith("Institution not registered");
      });
    });

    describe("isAccredited", function () {
      it("should return false for unregistered institutions", async function () {
        expect(await registry.isAccredited("unknown-id")).to.be.false;
      });
    });
  });

  describe("CertificateRegistry.sol", function () {
    it("should revert constructor if registry address is zero", async function () {
      await expect(
        CertificateRegistry.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid registry address");
    });

    it("should grant OPERATOR_ROLE to deployer", async function () {
      expect(await certificateRegistry.hasRole(OPERATOR_ROLE, deployer.address)).to.be.true;
      expect(await certificateRegistry.hasRole(OPERATOR_ROLE, unauthorizedUser.address)).to.be.false;
    });

    describe("issueCertificate", function () {
      it("should revert if non-operator calls issueCertificate", async function () {
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);
        await expect(
          certificateRegistry.connect(unauthorizedUser).issueCertificate(CRED_ID, INST_ID, IPFS_HASH)
        ).to.be.revertedWithCustomError(certificateRegistry, "AccessControlUnauthorizedAccount");
      });

      it("should revert if issuing for an unaccredited (or unregistered) institution", async function () {
        // Case 1: Unregistered institution
        await expect(
          certificateRegistry.connect(deployer).issueCertificate(CRED_ID, "non-existent-inst", IPFS_HASH)
        ).to.be.revertedWith("Institution is not accredited");

        // Case 2: Registered but accredited = false
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);
        await registry.connect(deployer).updateAccreditationStatus(INST_ID, false);

        await expect(
          certificateRegistry.connect(deployer).issueCertificate(CRED_ID, INST_ID, IPFS_HASH)
        ).to.be.revertedWith("Institution is not accredited");
      });

      it("should revert if credential ID is empty", async function () {
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);
        await expect(
          certificateRegistry.connect(deployer).issueCertificate("", INST_ID, IPFS_HASH)
        ).to.be.revertedWith("Invalid credential ID");
      });

      it("should successfully issue certificate when institution is accredited", async function () {
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);

        await expect(
          certificateRegistry.connect(deployer).issueCertificate(CRED_ID, INST_ID, IPFS_HASH)
        )
          .to.emit(certificateRegistry, "CertificateIssued")
          .withArgs(CRED_ID, CRED_ID, INST_ID, IPFS_HASH);

        const result = await certificateRegistry.verifyCertificate(CRED_ID);
        expect(result.ipfsHash).to.equal(IPFS_HASH);
        expect(result.revoked).to.be.false;
        expect(result.institutionId).to.equal(INST_ID);
        expect(result.isInstituteAccredited).to.be.true;
      });

      it("should revert if duplicate credential ID is issued", async function () {
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);
        await certificateRegistry.connect(deployer).issueCertificate(CRED_ID, INST_ID, IPFS_HASH);

        await expect(
          certificateRegistry.connect(deployer).issueCertificate(CRED_ID, INST_ID, "QmAnotherHash")
        ).to.be.revertedWith("Certificate already exists");
      });
    });

    describe("revokeCertificate", function () {
      beforeEach(async function () {
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);
        await certificateRegistry.connect(deployer).issueCertificate(CRED_ID, INST_ID, IPFS_HASH);
      });

      it("should allow operator to revoke a certificate", async function () {
        await expect(certificateRegistry.connect(deployer).revokeCertificate(CRED_ID))
          .to.emit(certificateRegistry, "CertificateRevoked")
          .withArgs(CRED_ID, CRED_ID);

        const result = await certificateRegistry.verifyCertificate(CRED_ID);
        expect(result.revoked).to.be.true;
      });

      it("should revert if non-operator calls revokeCertificate", async function () {
        await expect(
          certificateRegistry.connect(unauthorizedUser).revokeCertificate(CRED_ID)
        ).to.be.revertedWithCustomError(certificateRegistry, "AccessControlUnauthorizedAccount");
      });

      it("should revert if certificate does not exist", async function () {
        await expect(
          certificateRegistry.connect(deployer).revokeCertificate("unknown-cred")
        ).to.be.revertedWith("Certificate does not exist");
      });

      it("should revert if certificate is already revoked", async function () {
        await certificateRegistry.connect(deployer).revokeCertificate(CRED_ID);
        await expect(
          certificateRegistry.connect(deployer).revokeCertificate(CRED_ID)
        ).to.be.revertedWith("Certificate already revoked");
      });
    });

    describe("verifyCertificate", function () {
      it("should revert if verifying non-existent certificate", async function () {
        await expect(
          certificateRegistry.verifyCertificate("non-existent-cred")
        ).to.be.revertedWith("Certificate does not exist");
      });
    });

    describe("The Core Scenario: Live Accreditation Verification Dynamics", function () {
      it("issue certificate while accredited -> revoke accreditation -> verifyCertificate dynamically reflects unaccredited status while certificate data is unchanged", async function () {
        // 1. Add institute and verify initial accredited state
        await registry.connect(deployer).addInstitute(INST_ID, INST_NAME);
        expect(await registry.isAccredited(INST_ID)).to.be.true;

        // 2. Issue certificate while accredited
        await certificateRegistry.connect(deployer).issueCertificate(CRED_ID, INST_ID, IPFS_HASH);

        // 3. Verify immediately after issuance
        let verification = await certificateRegistry.verifyCertificate(CRED_ID);
        expect(verification.ipfsHash).to.equal(IPFS_HASH);
        expect(verification.revoked).to.be.false;
        expect(verification.institutionId).to.equal(INST_ID);
        expect(verification.isInstituteAccredited).to.be.true;

        // 4. Revoke the institution's accreditation in Registry
        await registry.connect(deployer).updateAccreditationStatus(INST_ID, false);
        expect(await registry.isAccredited(INST_ID)).to.be.false;

        // 5. Call verifyCertificate() again:
        // Confirm it now reports the institution as NOT accredited,
        // while the certificate's IPFS hash and revoked status remain completely untouched!
        verification = await certificateRegistry.verifyCertificate(CRED_ID);
        expect(verification.isInstituteAccredited).to.be.false; // dynamically fetched from Registry
        expect(verification.ipfsHash).to.equal(IPFS_HASH); // unchanged
        expect(verification.revoked).to.be.false; // unchanged
        expect(verification.institutionId).to.equal(INST_ID); // unchanged

        // 6. Re-accredit institution
        await registry.connect(deployer).updateAccreditationStatus(INST_ID, true);
        verification = await certificateRegistry.verifyCertificate(CRED_ID);
        expect(verification.isInstituteAccredited).to.be.true;

        // 7. Revoke the certificate itself
        await certificateRegistry.connect(deployer).revokeCertificate(CRED_ID);
        verification = await certificateRegistry.verifyCertificate(CRED_ID);
        expect(verification.revoked).to.be.true;
        expect(verification.isInstituteAccredited).to.be.true;
        expect(verification.ipfsHash).to.equal(IPFS_HASH);
      });
    });
  });
});
