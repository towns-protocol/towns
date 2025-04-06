// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {ISchemaRegistry} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

// types
import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

// libraries
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {SchemaRegistryStorage} from "../storage/SchemaRegistryStorage.sol";
import {DataTypes} from "../types/DataTypes.sol";

// contracts

library SchemaLib {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Schema Management                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function registerSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    )
        internal
        returns (bytes32 schemaUID)
    {
        // check empty schema
        if (bytes(schema).length == 0) {
            DataTypes.InvalidSchema.selector.revertWith();
        }

        checkResolver(resolver);

        SchemaRecord memory schemaRecord =
            SchemaRecord({uid: EMPTY_UID, resolver: resolver, revocable: revocable, schema: schema});

        SchemaRegistryStorage.Layout storage db = SchemaRegistryStorage.getLayout();

        schemaUID = getUID(schemaRecord);
        if (db.schemas[schemaUID].uid != EMPTY_UID) {
            DataTypes.SchemaAlreadyRegistered.selector.revertWith();
        }

        schemaRecord.uid = schemaUID;
        db.schemas[schemaUID] = schemaRecord;

        emit ISchemaRegistry.Registered(schemaUID, msg.sender, schemaRecord);

        return schemaUID;
    }

    function getSchema(bytes32 uid) internal view returns (SchemaRecord memory) {
        return SchemaRegistryStorage.getLayout().schemas[uid];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Validator Checks                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function checkResolver(ISchemaResolver resolver) internal view {
        if (
            address(resolver) != address(0)
                && !IERC165(address(resolver)).supportsInterface(type(ISchemaResolver).interfaceId)
        ) {
            DataTypes.InvalidSchemaResolver.selector.revertWith();
        }
    }

    function getUID(SchemaRecord memory schema) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(schema.schema, schema.resolver, schema.revocable));
    }

    function time() internal view returns (uint64) {
        return uint64(block.timestamp);
    }
}
