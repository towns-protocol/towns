// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaRegistry} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ISchemaBase} from "./ISchema.sol";

// types
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

// libraries
import {SchemaLib} from "./SchemaLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {SchemaStorage} from "./SchemaStorage.sol";
// contracts

abstract contract SchemaBase is ISchemaBase {
    using CustomRevert for bytes4;
    using SchemaLib for SchemaRecord;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Schema Management                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Registers a new schema in the registry
    /// @param schema The schema string to register
    /// @param resolver The resolver contract for this schema
    /// @param revocable Whether attestations using this schema can be revoked
    /// @return schemaUID The unique identifier of the registered schema
    /// @dev Reverts if schema is empty, resolver is invalid, or schema is already registered
    function _registerSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) internal returns (bytes32 schemaUID) {
        // check empty schema
        if (bytes(schema).length == 0) {
            InvalidSchema.selector.revertWith();
        }

        checkResolver(resolver);

        SchemaRecord memory schemaRecord = SchemaRecord({
            uid: EMPTY_UID,
            resolver: resolver,
            revocable: revocable,
            schema: schema
        });

        SchemaStorage.Layout storage db = SchemaStorage.getLayout();

        schemaUID = schemaRecord.getUID();
        if (db.schemas[schemaUID].uid != EMPTY_UID) {
            SchemaAlreadyRegistered.selector.revertWith();
        }

        schemaRecord.uid = schemaUID;
        db.schemas[schemaUID] = schemaRecord;

        emit ISchemaRegistry.Registered(schemaUID, msg.sender, schemaRecord);
    }

    /// @notice Retrieves a schema record by its UID
    /// @param uid The unique identifier of the schema
    /// @return The schema record
    function _getSchema(bytes32 uid) internal view returns (SchemaRecord memory) {
        return SchemaStorage.getSchema(uid);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Validator Checks                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Validates that a resolver implements the required interface
    /// @param resolver The resolver contract to check
    /// @dev Reverts if the resolver doesn't implement ISchemaResolver interface
    function checkResolver(ISchemaResolver resolver) internal view {
        if (
            address(resolver) != address(0) &&
            !IERC165(address(resolver)).supportsInterface(type(ISchemaResolver).interfaceId)
        ) {
            InvalidSchemaResolver.selector.revertWith();
        }
    }
}
