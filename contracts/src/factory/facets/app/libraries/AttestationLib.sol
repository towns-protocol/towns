// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {DataTypes} from "../IAppRegistry.sol";
import {AppRegistryStorage} from "../AppRegistryStorage.sol";
import {SchemaLib} from "./SchemaLib.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {ModuleTypeLib, ModuleType, PackedModuleTypes} from "./ModuleTypes.sol";
// contracts

library AttestationLib {
  using CustomRevert for bytes4;
  using ModuleTypeLib for ModuleType[];

  function resolveAttestation(
    bytes32 schemaId,
    DataTypes.Attestation memory attestation,
    bool isRevocation
  ) internal {
    DataTypes.Schema memory schema = SchemaLib.getSchema(schemaId);
    if (schema.uid == DataTypes.EMPTY_UID) {
      DataTypes.InvalidSchema.selector.revertWith();
    }

    if (address(schema.resolver) != address(0)) {
      if (isRevocation) {
        if (!schema.resolver.revoke(attestation)) {
          DataTypes.InvalidRevocation.selector.revertWith();
        }
      } else if (!schema.resolver.attest(attestation)) {
        DataTypes.InvalidAttestation.selector.revertWith();
      }
    }
  }

  function attest(
    bytes32 schemaId,
    address attester,
    DataTypes.AttestationRequest memory request
  ) internal returns (DataTypes.Attestation memory) {
    DataTypes.Schema memory schema = SchemaLib.getSchema(schemaId);
    if (schema.uid == DataTypes.EMPTY_UID) {
      DataTypes.InvalidSchema.selector.revertWith();
    }

    uint64 timeNow = time();

    if (
      request.expirationTime != DataTypes.NO_EXPIRATION_TIME &&
      request.expirationTime <= timeNow
    ) {
      DataTypes.InvalidExpirationTime.selector.revertWith();
    }

    DataTypes.Attestation memory attestation = DataTypes.Attestation({
      uid: DataTypes.EMPTY_UID,
      schemaId: schemaId,
      time: timeNow,
      expirationTime: request.expirationTime,
      revocationTime: 0,
      moduleTypes: request.moduleTypes.pack(),
      recipient: request.recipient,
      attester: attester,
      data: request.data
    });

    bytes32 attestationUID = hashAttestation(attestation, 0);

    AppRegistryStorage.Layout storage db = AppRegistryStorage.getLayout();

    if (db.attestations[attestationUID].uid != DataTypes.EMPTY_UID) {
      DataTypes.InvalidAttestation.selector.revertWith();
    }

    attestation.uid = attestationUID;
    db.attestations[attestationUID] = attestation;

    emit DataTypes.AttestationCreated(
      attestation.recipient,
      attestation.attester,
      attestation.uid,
      attestation.schemaId
    );

    return attestation;
  }

  function revoke(
    address revoker,
    DataTypes.RevocationRequest memory request
  ) internal returns (DataTypes.Attestation memory) {
    DataTypes.Schema memory schema = SchemaLib.getSchema(request.schemaId);
    if (schema.uid == DataTypes.EMPTY_UID) {
      DataTypes.InvalidSchema.selector.revertWith();
    }

    DataTypes.Attestation memory attestation = getAttestation(request.uid);

    if (attestation.uid == DataTypes.EMPTY_UID) {
      DataTypes.InvalidAttestation.selector.revertWith();
    }

    if (attestation.schemaId != request.schemaId) {
      DataTypes.InvalidSchema.selector.revertWith();
    }

    if (attestation.attester != revoker) {
      DataTypes.InvalidRevoker.selector.revertWith();
    }

    if (attestation.revocationTime != 0) {
      DataTypes.InvalidRevocation.selector.revertWith();
    }

    AppRegistryStorage.Layout storage db = AppRegistryStorage.getLayout();

    db.attestations[attestation.uid].revocationTime = time();
    db.recipientToAttesterToAttestation[attestation.recipient][
      attestation.attester
    ] = attestation.uid;

    emit DataTypes.AttestationRevoked(
      attestation.recipient,
      attestation.attester,
      attestation.uid,
      attestation.schemaId
    );

    return attestation;
  }

  function getAttestation(
    bytes32 uid
  ) internal view returns (DataTypes.Attestation memory) {
    return AppRegistryStorage.getLayout().attestations[uid];
  }

  function getAttestationByRecipientAndAttester(
    address recipient,
    address attester
  ) internal view returns (DataTypes.Attestation memory) {
    bytes32 uid = AppRegistryStorage
      .getLayout()
      .recipientToAttesterToAttestation[recipient][attester];

    if (uid == DataTypes.EMPTY_UID) {
      DataTypes.InvalidAttestation.selector.revertWith();
    }

    return getAttestation(uid);
  }
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     Validator Checks                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function checkValid(
    DataTypes.Attestation memory attestation,
    ModuleType moduleType
  ) internal view returns (bool) {
    (
      bytes32 uid,
      uint64 expirationTime,
      uint64 revocationTime,
      PackedModuleTypes moduleTypes
    ) = (
        attestation.uid,
        attestation.expirationTime,
        attestation.revocationTime,
        attestation.moduleTypes
      );

    if (uid == DataTypes.EMPTY_UID) {
      return false;
    }

    if (
      expirationTime != DataTypes.NO_EXPIRATION_TIME &&
      block.timestamp > expirationTime
    ) {
      return false;
    }

    if (revocationTime != 0) {
      return false;
    }

    if (
      moduleType != DataTypes.ZERO_MODULE_TYPE &&
      !ModuleTypeLib.isType(moduleTypes, moduleType)
    ) {
      return false;
    }

    return true;
  }

  function hashAttestation(
    DataTypes.Attestation memory attestation,
    uint32 bump
  ) internal pure returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(
          attestation.schemaId,
          attestation.recipient,
          attestation.attester,
          attestation.time,
          attestation.expirationTime,
          attestation.data,
          bump
        )
      );
  }

  function time() internal view returns (uint64) {
    return uint64(block.timestamp);
  }
}
