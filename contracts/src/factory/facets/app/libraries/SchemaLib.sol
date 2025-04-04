// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "../interfaces/ISchemaResolver.sol";
// libraries
import {DataTypes} from "../DataTypes.sol";
import {SchemaRegistryStorage} from "../storage/SchemaRegistryStorage.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";

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
  ) internal returns (bytes32 schemaUID) {
    checkResolver(resolver);

    DataTypes.Schema memory schemaRecord = DataTypes.Schema({
      uid: DataTypes.EMPTY_UID,
      resolver: resolver,
      revocable: revocable,
      schema: schema
    });

    SchemaRegistryStorage.Layout storage db = SchemaRegistryStorage.getLayout();

    schemaUID = getUID(schemaRecord);
    if (db.schemas[schemaUID].uid != DataTypes.EMPTY_UID) {
      DataTypes.SchemaAlreadyRegistered.selector.revertWith();
    }

    schemaRecord.uid = schemaUID;
    db.schemas[schemaUID] = schemaRecord;

    emit DataTypes.SchemaRegistered(schemaUID, msg.sender, schemaRecord);

    return schemaUID;
  }

  function getSchema(
    bytes32 uid
  ) internal view returns (DataTypes.Schema memory) {
    return SchemaRegistryStorage.getLayout().schemas[uid];
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     Validator Checks                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function checkResolver(ISchemaResolver resolver) internal view {
    if (
      address(resolver) != address(0) &&
      !resolver.supportsInterface(type(ISchemaResolver).interfaceId)
    ) {
      DataTypes.InvalidSchemaResolver.selector.revertWith();
    }
  }

  function getUID(
    DataTypes.Schema memory schema
  ) internal pure returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(schema.schema, schema.resolver, schema.revocable)
      );
  }

  function time() internal view returns (uint64) {
    return uint64(block.timestamp);
  }
}
