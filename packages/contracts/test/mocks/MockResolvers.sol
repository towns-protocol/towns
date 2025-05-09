// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// types
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {SchemaResolver} from "src/apps/SchemaResolver.sol";

contract MockPluginResolver is SchemaResolver {
    mapping(address plugin => address owner) public pluginOwners;

    constructor(address _appRegistry) {
        __SchemaResolver_init(_appRegistry);
    }

    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(ISchemaResolver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    function onAttest(Attestation calldata attestation, uint256) internal override returns (bool) {
        (address plugin, , , ) = abi.decode(attestation.data, (address, uint8, string, bool));

        if (attestation.recipient != plugin) return false;
        pluginOwners[plugin] = attestation.attester;

        return true;
    }

    function onRevoke(Attestation calldata attestation, uint256) internal override returns (bool) {
        if (pluginOwners[attestation.recipient] != attestation.attester) {
            return false;
        }
        pluginOwners[attestation.recipient] = address(0);
        return true;
    }
}

contract MockPayableResolver is SchemaResolver {
    constructor(address _appRegistry) {
        __SchemaResolver_init(_appRegistry);
    }

    function isPayable() public pure override returns (bool) {
        return true;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(ISchemaResolver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    function onAttest(Attestation calldata, uint256) internal override returns (bool) {
        if (msg.value < 1 ether) {
            revert InsufficientValue();
        }
        return true;
    }

    function onRevoke(Attestation calldata, uint256) internal pure override returns (bool) {
        return true;
    }
}
