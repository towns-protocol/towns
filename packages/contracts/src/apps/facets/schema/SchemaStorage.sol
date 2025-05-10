// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

// structs
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

/**
 * @title SchemaStorage
 * @notice Storage library for schema records
 * @dev Uses a dedicated storage slot to ensure storage safety in the diamond pattern
 */
library SchemaStorage {
    // keccak256(abi.encode(uint256(keccak256("attestations.module.schema.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xfd5bc2b1c92b0a5f91f2b26739da3957fadd042854b0b9b4b07f2b0885d3e400;

    /**
     * @notice Storage layout for the schema module
     * @dev Contains mapping from schema UIDs to schema records
     * @param schemas Mapping from schema UID to schema record
     */
    struct Layout {
        mapping(bytes32 uid => SchemaRecord schema) schemas;
    }

    /**
     * @notice Returns the storage layout for the schema module
     * @dev Uses assembly to access the specific storage slot
     * @return ds The storage layout struct
     */
    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }

    /**
     * @notice Retrieves a schema record by its UID
     * @dev Gets the schema record from storage
     * @param uid The unique identifier of the schema to retrieve
     * @return The schema record associated with the provided UID
     */
    function getSchema(bytes32 uid) internal view returns (SchemaRecord memory) {
        return getLayout().schemas[uid];
    }
}
