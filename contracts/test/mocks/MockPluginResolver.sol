// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ISchemaResolver} from "contracts/src/app/interfaces/ISchemaResolver.sol";

// libraries
import {DataTypes} from "contracts/src/app/types/DataTypes.sol";

// contracts
import {SchemaResolver} from "contracts/src/app/resolvers/SchemaResolver.sol";

contract MockPluginResolver is SchemaResolver {
    mapping(address plugin => address owner) public pluginOwners;

    constructor(address _appRegistry) SchemaResolver(_appRegistry) {}

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(ISchemaResolver).interfaceId
            || interfaceId == type(IERC165).interfaceId;
    }

    function onAttest(
        DataTypes.Attestation calldata attestation,
        uint256
    )
        internal
        override
        returns (bool)
    {
        (address plugin,,,) = abi.decode(attestation.data, (address, uint8, string, bool));

        if (attestation.recipient != plugin) return false;
        pluginOwners[plugin] = attestation.attester;

        return true;
    }

    function onRevoke(
        DataTypes.Attestation calldata attestation,
        uint256
    )
        internal
        override
        returns (bool)
    {
        if (pluginOwners[attestation.recipient] != attestation.attester) {
            return false;
        }
        pluginOwners[attestation.recipient] = address(0);
        return true;
    }
}
