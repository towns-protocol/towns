// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

// structs
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

library SchemaStorage {
    struct Layout {
        mapping(bytes32 uid => SchemaRecord schema) schemas;
    }

    // keccak256(abi.encode(uint256(keccak256("attestations.module.schema.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xfd5bc2b1c92b0a5f91f2b26739da3957fadd042854b0b9b4b07f2b0885d3e400;

    function getSchema(bytes32 uid) internal view returns (SchemaRecord memory) {
        return getLayout().schemas[uid];
    }

    /// @notice Returns the storage layout for the schema module
    /// @return ds The storage layout struct
    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }
}
