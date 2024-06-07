// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnablePending} from "./IOwnablePending.sol";

// libraries

// contracts
import {OwnablePendingBase} from "./OwnablePendingBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract OwnablePendingFacet is IOwnablePending, OwnablePendingBase, Facet {
  function __OwnablePending_init(address owner_) external onlyInitializing {
    _transferOwnership(owner_);
    _addInterface(type(IOwnablePending).interfaceId);
  }

  /// @inheritdoc IOwnablePending
  function startTransferOwnership(address _newOwner) external onlyOwner {
    _startTransferOwnership(msg.sender, _newOwner);
  }

  /// @inheritdoc IOwnablePending
  function acceptOwnership() external override onlyPendingOwner {
    _acceptOwnership();
  }

  /// @inheritdoc IOwnablePending
  function currentOwner() external view returns (address) {
    return _owner();
  }

  /// @inheritdoc IOwnablePending
  function pendingOwner() external view returns (address) {
    return _pendingOwner();
  }
}
