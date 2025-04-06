// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IAttestationRegistry} from "../../interfaces/IAttestationRegistry.sol";

import {IERC6900ExtensionRegistry} from "./IERC6900ExtensionRegistry.sol";
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries
import {TrustedAttestersStorage} from "./TrustedAttestersStorage.sol";
import {TrustedLib} from "./TrustedLib.sol";

// types
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {SchemaResolverUpgradeable} from "../SchemaResolverUpgradeable.sol";
import {Initializable} from "@towns-protocol/diamond/src/facets/initializable/Initializable.sol";

contract TrustedAttesterResolver is
    SchemaResolverUpgradeable,
    IERC6900ExtensionRegistry,
    Initializable
{
    function __TrustedAttesterResolver_init(address _appRegistry) external initializer {
        __SchemaResolver_init(_appRegistry);
    }

    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == type(ISchemaResolver).interfaceId;
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function trustAttesters(uint8 threshold, address[] calldata attesters) external {
        TrustedLib.trustAttesters(threshold, attesters);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function check(address module) external view {
        TrustedLib.check(msg.sender, module);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function checkForAccount(address account, address module) external view {
        TrustedLib.check(account, module);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function check(address module, address[] calldata attesters, uint256 threshold) external view {
        TrustedLib.check(module, attesters, threshold);
    }

    function getAttestation(
        address recipient,
        address attester
    )
        external
        view
        returns (Attestation memory)
    {
        return TrustedLib.getAttestation(recipient, attester);
    }

    function onAttest(Attestation calldata attestation, uint256) internal override returns (bool) {
        TrustedAttestersStorage.saveAttestation(
            attestation.recipient, attestation.attester, attestation.uid
        );
        return true;
    }

    function onRevoke(Attestation calldata, uint256) internal pure override returns (bool) {
        return true;
    }
}
