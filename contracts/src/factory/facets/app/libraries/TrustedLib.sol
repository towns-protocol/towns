// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC7484} from "../interfaces/IERC7484.sol";
// libraries
import {LibSort} from "solady/utils/LibSort.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {DataTypes} from "../IAppRegistry.sol";
import {AppRegistryStorage} from "../AppRegistryStorage.sol";
import {AttestationLib} from "./AttestationLib.sol";
import {ModuleTypeLib, ModuleType, PackedModuleTypes} from "./ModuleTypes.sol";
// contracts

library TrustedLib {
  using LibSort for address[];
  using CustomRevert for bytes4;
  using ModuleTypeLib for PackedModuleTypes;

  function trustAttesters(
    uint8 threshold,
    address[] calldata attesters
  ) internal {
    uint256 len = attesters.length;

    if (!attesters.isSortedAndUniquified()) {
      DataTypes.InvalidAttesters.selector.revertWith();
    }

    if (len == 0 || len > type(uint8).max) {
      DataTypes.InvalidAttesters.selector.revertWith();
    }

    if (attesters.length != len) {
      DataTypes.InvalidAttesters.selector.revertWith();
    }

    if (attesters[0] == address(0)) {
      DataTypes.InvalidAttesters.selector.revertWith();
    }

    if (threshold > len) {
      DataTypes.InvalidThreshold.selector.revertWith();
    }

    AppRegistryStorage.Layout storage db = AppRegistryStorage.getLayout();

    DataTypes.TrustedAttester storage trustedAttester = db.trustedAttesters[
      msg.sender
    ];

    trustedAttester.count = uint8(len);
    trustedAttester.threshold = threshold;
    trustedAttester.attester = attesters[0];

    for (uint256 i; i < len - 1; ++i) {
      address attester = attesters[i];
      trustedAttester.linkedAttesters[attester][msg.sender] = attesters[i + 1];
    }

    emit IERC7484.NewTrustedAttesters(msg.sender);
  }

  function check(
    address account,
    address module,
    ModuleType moduleType
  ) internal view {
    AppRegistryStorage.Layout storage db = AppRegistryStorage.getLayout();

    DataTypes.TrustedAttester storage trustedAttester = db.trustedAttesters[
      account
    ];

    (uint8 attesterCount, uint8 threshold, address attester) = (
      trustedAttester.count,
      trustedAttester.threshold,
      trustedAttester.attester
    );

    if (attester == address(0) || threshold == 0) {
      DataTypes.NoTrustedAttestersFound.selector.revertWith();
    } else if (threshold == 1) {
      DataTypes.Attestation memory attestation = AttestationLib
        .getAttestationByRecipientAndAttester({
          recipient: module,
          attester: attester
        });

      if (AttestationLib.checkValid(attestation, moduleType)) return;

      for (uint256 i; i < attesterCount; ++i) {
        attester = trustedAttester.linkedAttesters[attester][account];
        attestation = AttestationLib.getAttestationByRecipientAndAttester({
          recipient: module,
          attester: attester
        });
        if (AttestationLib.checkValid(attestation, moduleType)) return;
      }

      DataTypes.InsufficientAttestations.selector.revertWith();
    } else {
      DataTypes.Attestation memory attestation = AttestationLib
        .getAttestationByRecipientAndAttester({
          recipient: module,
          attester: attester
        });
      if (AttestationLib.checkValid(attestation, moduleType)) return;

      for (uint256 i; i < attesterCount; ++i) {
        attester = trustedAttester.linkedAttesters[attester][account];
        attestation = AttestationLib.getAttestationByRecipientAndAttester({
          recipient: module,
          attester: attester
        });
        if (AttestationLib.checkValid(attestation, moduleType)) threshold--;
        if (threshold == 0) return;
      }
      if (threshold > 0) {
        DataTypes.InsufficientAttestations.selector.revertWith();
      }
    }
  }

  function check(
    address module,
    address[] calldata attesters,
    uint256 threshold
  ) internal view {
    uint256 len = attesters.length;
    if (len == 0 || threshold == 0) {
      DataTypes.NoTrustedAttestersFound.selector.revertWith();
    } else if (len < threshold) {
      DataTypes.InsufficientAttestations.selector.revertWith();
    }

    address cache;
    for (uint256 i; i < len; ++i) {
      address attester = attesters[i];
      if (attester <= cache) DataTypes.InvalidAttesters.selector.revertWith();
      else cache = attester;

      DataTypes.Attestation memory attestation = AttestationLib
        .getAttestationByRecipientAndAttester({
          recipient: module,
          attester: attester
        });

      if (AttestationLib.checkValid(attestation, DataTypes.ZERO_MODULE_TYPE)) {
        --threshold;
        if (threshold == 0) return;
      }
    }
    DataTypes.InsufficientAttestations.selector.revertWith();
  }

  function check(
    address module,
    ModuleType moduleType,
    address[] calldata attesters,
    uint256 threshold
  ) internal view {
    uint256 len = attesters.length;
    if (len == 0 || threshold == 0) {
      DataTypes.NoTrustedAttestersFound.selector.revertWith();
    } else if (len < threshold) {
      DataTypes.InsufficientAttestations.selector.revertWith();
    }

    address cache;
    for (uint256 i; i < len; ++i) {
      address attester = attesters[i];
      if (attester <= cache) DataTypes.InvalidAttesters.selector.revertWith();
      else cache = attester;

      DataTypes.Attestation memory attestation = AttestationLib
        .getAttestationByRecipientAndAttester({
          recipient: module,
          attester: attester
        });

      if (AttestationLib.checkValid(attestation, moduleType)) {
        --threshold;
        if (threshold == 0) return;
      }
    }
    DataTypes.InsufficientAttestations.selector.revertWith();
  }

  function findTrustedAttesters(
    address account
  ) internal view returns (address[] memory attesters) {
    AppRegistryStorage.Layout storage db = AppRegistryStorage.getLayout();

    DataTypes.TrustedAttester storage trustedAttesters = db.trustedAttesters[
      account
    ];

    uint256 len = trustedAttesters.count;
    address firstAttester = trustedAttesters.attester;

    if (len == 0) return attesters;

    attesters = new address[](len);
    attesters[0] = firstAttester;

    for (uint256 i = 1; i < len; ++i) {
      attesters[i] = trustedAttesters.linkedAttesters[attesters[i - 1]][
        account
      ];
    }
  }
}
