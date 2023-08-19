// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IOwnablePending} from "./IOwnablePending.sol";
import {IERC173} from "../IERC173.sol";

// libraries

// contracts
import {OwnablePendingBase} from "./OwnablePendingBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract OwnablePendingFacet is
  IOwnablePending,
  IERC173,
  OwnablePendingBase,
  Facet
{
  function __OwnablePending_init(address owner_) external onlyInitializing {
    _transferOwnership(owner_);
    _addInterface(type(IOwnablePending).interfaceId);
  }

  function transferOwnership(address _newOwner) external override onlyOwner {
    _startTransferOwnership(msg.sender, _newOwner);
  }

  function acceptOwnership() external override onlyPendingOwner {
    _acceptOwnership();
  }

  function owner() external view override returns (address) {
    return _owner();
  }

  function pendingOwner() external view returns (address) {
    return _pendingOwner();
  }
}
