// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

library SchemaRegistryStorage {
    // keccak256(abi.encode(uint256(keccak256("towns.facets.app.schema.registry.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x5ba8ee142c4318feae31e8bb48d5ff771f11fa24c56ebe04d08eea2fc2002800;

    struct Layout {
        mapping(bytes32 uid => SchemaRecord schema) schemas;
    }

    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }
}
