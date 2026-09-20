// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Registry
 * @notice Stores accredited educational institutions. Managed by OPERATOR_ROLE.
 */
contract Registry is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Institution {
        string name;
        bool accredited;
        bool exists;
    }

    // Mapping from institutionId to Institution details
    mapping(string => Institution) private _institutions;

    event InstitutionAdded(string indexed institutionIdIndexed, string institutionId, string name);
    event AccreditationUpdated(string indexed institutionIdIndexed, string institutionId, bool accredited);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /**
     * @notice Add a new institution. Only OPERATOR_ROLE can call this.
     * @param institutionId Unique identifier of the institution.
     * @param name Name of the institution.
     */
    function addInstitute(string calldata institutionId, string calldata name) external onlyRole(OPERATOR_ROLE) {
        require(bytes(institutionId).length > 0, "Invalid institution ID");
        require(!_institutions[institutionId].exists, "Institution already exists");

        _institutions[institutionId] = Institution({
            name: name,
            accredited: true,
            exists: true
        });

        emit InstitutionAdded(institutionId, institutionId, name);
    }

    /**
     * @notice Updates the accreditation status of an existing institution. Only OPERATOR_ROLE.
     * @param institutionId Unique identifier of the institution.
     * @param accredited New accreditation status.
     */
    function updateAccreditationStatus(string calldata institutionId, bool accredited) external onlyRole(OPERATOR_ROLE) {
        require(_institutions[institutionId].exists, "Institution not registered");
        _institutions[institutionId].accredited = accredited;

        emit AccreditationUpdated(institutionId, institutionId, accredited);
    }

    /**
     * @notice Checks if an institution is currently accredited.
     * @param institutionId Unique identifier of the institution.
     * @return bool True if registered and accredited, false otherwise.
     */
    function isAccredited(string calldata institutionId) external view returns (bool) {
        return _institutions[institutionId].exists && _institutions[institutionId].accredited;
    }
}
