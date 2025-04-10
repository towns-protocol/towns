// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExtensionRegistry} from "./interfaces/IERC6900ExtensionRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
// libraries

import {SchemaLib} from "./libraries/SchemaLib.sol";
import {VerificationLib} from "./libraries/VerificationLib.sol";
// contracts
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract VerificationRegistry is IERC6900ExtensionRegistry, OwnableBase {
    function getVerificationSchema() external pure returns (string memory) {
        return "address module, bool trusted";
    }

    /// @notice Get the active schema ID used for module attestations
    /// @return The schema ID
    function getVerificationSchemaId() external view returns (bytes32) {
        return VerificationLib.getSchemaId();
    }

    /// @notice Set the schema ID used for module attestations
    /// @param schemaId The new schema ID
    function registerVerificationSchema(bytes32 schemaId) external onlyOwner {
        VerificationLib.setSchemaId(schemaId);
    }

    function approveVerification(address module, address attester) external {
        VerificationLib.attest(module, attester);
    }

    function revokeVerification(address module, address attester) external {
        VerificationLib.revoke(module, attester);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function trustAttesters(uint8 threshold, address[] calldata attesters) external {
        VerificationLib.trustAttesters(threshold, attesters);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function check(address module) external view {
        VerificationLib.check(msg.sender, module);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function checkForAccount(address account, address module) external view {
        VerificationLib.check(account, module);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function check(address module, address[] calldata attesters, uint256 threshold) external view {
        VerificationLib.check(module, attesters, threshold);
    }
}
