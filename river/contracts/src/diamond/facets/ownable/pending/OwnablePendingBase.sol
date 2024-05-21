// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnablePendingBase} from "./IOwnablePending.sol";

// libraries
import {OwnablePendingStorage} from "./OwnablePendingStorage.sol";

// contracts
import {OwnableBase} from "../OwnableBase.sol";

abstract contract OwnablePendingBase is IOwnablePendingBase, OwnableBase {
  modifier onlyPendingOwner() {
    if (msg.sender != _pendingOwner())
      revert OwnablePending_NotPendingOwner(msg.sender);
    _;
  }

  function _startTransferOwnership(
    address owner,
    address pendingOwner
  ) internal {
    OwnablePendingStorage.layout().pendingOwner = pendingOwner;
    emit OwnershipTransferStarted(owner, pendingOwner);
  }

  function _acceptOwnership() internal {
    address newOwner = _pendingOwner();
    _transferOwnership(newOwner);

    delete OwnablePendingStorage.layout().pendingOwner;
  }

  function _renounceOwnership() internal override {
    OwnablePendingStorage.layout().pendingOwner = address(0);
    super._renounceOwnership();
  }

  function _pendingOwner() internal view returns (address) {
    return OwnablePendingStorage.layout().pendingOwner;
  }
}
