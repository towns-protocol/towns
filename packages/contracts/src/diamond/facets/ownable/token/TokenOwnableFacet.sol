// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IERC173} from "../IERC173.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {TokenOwnableBase} from "./TokenOwnableBase.sol";

contract TokenOwnableFacet is IERC173, TokenOwnableBase, Facet {
  function __Ownable_init(
    address collection,
    uint256 tokenId
  ) external onlyInitializing {
    _setOwnership(collection, tokenId);
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
