// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {OwnableBase} from "./OwnableBase.sol";

contract OwnableFacet is IERC173, OwnableBase, Facet {
  function __Ownable_init(address owner_) external onlyInitializing {
    _transferOwnership(owner_);
    _addInterface(type(IERC173).interfaceId);
  }

  /// @inheritdoc IERC173
  function owner() external view returns (address) {
    return _owner();
  }

  /// @inheritdoc IERC173
  function transferOwnership(address newOwner) external onlyOwner {
    _transferOwnership(newOwner);
  }
}
