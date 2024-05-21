// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {OwnableBase} from "./OwnableBase.sol";

contract OwnableFacet is IERC173, OwnableBase, Facet {
  function __Ownable_init(address owner_) external onlyInitializing {
    __Ownable_init_unchained(owner_);
  }

  function __Ownable_init_unchained(address owner_) internal {
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
