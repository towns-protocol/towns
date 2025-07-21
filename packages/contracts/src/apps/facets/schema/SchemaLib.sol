// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// struct
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

library SchemaLib {
    /// @notice Generates a unique identifier for a schema record
    /// @param self The schema record to generate the UID for
    /// @return The unique identifier for the schema
    function getUID(SchemaRecord memory self) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(self.schema, self.resolver, self.revocable));
    }
}
