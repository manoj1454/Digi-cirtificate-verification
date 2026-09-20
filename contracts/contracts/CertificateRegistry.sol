// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IRegistry {
    function isAccredited(string calldata institutionId) external view returns (bool);
}

/**
 * @title CertificateRegistry
 * @notice Stores and verifies academic certificates.
 */
contract CertificateRegistry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IRegistry public immutable registry;

    struct Certificate {
        string ipfsHash;
        string institutionId;
        bool revoked;
        bool exists;
    }

    // Mapping from credentialId to Certificate
    mapping(string => Certificate) private _certificates;

    event CertificateIssued(
        string indexed credentialIdIndexed,
        string credentialId,
        string institutionId,
        string ipfsHash
    );
    event CertificateRevoked(
        string indexed credentialIdIndexed,
        string credentialId
    );

    constructor(address registryAddress) {
        require(registryAddress != address(0), "Invalid registry address");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        registry = IRegistry(registryAddress);
    }

    /**
     * @notice Issue a new certificate. Reverts if institution is not currently accredited.
     * @param credentialId Unique certificate / credential ID.
     * @param institutionId Institution issuing the certificate.
     * @param ipfsHash IPFS content hash storing the certificate payload.
     */
    function issueCertificate(
        string calldata credentialId,
        string calldata institutionId,
        string calldata ipfsHash
    ) external onlyRole(OPERATOR_ROLE) {
        require(bytes(credentialId).length > 0, "Invalid credential ID");
        require(!_certificates[credentialId].exists, "Certificate already exists");
        require(registry.isAccredited(institutionId), "Institution is not accredited");

        _certificates[credentialId] = Certificate({
            ipfsHash: ipfsHash,
            institutionId: institutionId,
            revoked: false,
            exists: true
        });

        emit CertificateIssued(credentialId, credentialId, institutionId, ipfsHash);
    }

    /**
     * @notice Revoke an existing certificate.
     * @param credentialId Unique certificate identifier.
     */
    function revokeCertificate(string calldata credentialId) external onlyRole(OPERATOR_ROLE) {
        require(_certificates[credentialId].exists, "Certificate does not exist");
        require(!_certificates[credentialId].revoked, "Certificate already revoked");

        _certificates[credentialId].revoked = true;

        emit CertificateRevoked(credentialId, credentialId);
    }

    /**
     * @notice Verifies a certificate and dynamically fetches current live accreditation status.
     * @param credentialId Unique certificate identifier.
     * @return ipfsHash Stored IPFS hash.
     * @return revoked Revocation status of the certificate.
     * @return institutionId Issuing institution ID.
     * @return isInstituteAccredited Live accreditation status of issuing institution.
     */
    function verifyCertificate(string calldata credentialId)
        external
        view
        returns (
            string memory ipfsHash,
            bool revoked,
            string memory institutionId,
            bool isInstituteAccredited
        )
    {
        require(_certificates[credentialId].exists, "Certificate does not exist");
        Certificate memory cert = _certificates[credentialId];
        bool accredited = registry.isAccredited(cert.institutionId);

        return (cert.ipfsHash, cert.revoked, cert.institutionId, accredited);
    }
}
