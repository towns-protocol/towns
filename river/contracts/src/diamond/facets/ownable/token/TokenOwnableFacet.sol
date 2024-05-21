// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "../IERC173.sol";
import {ITokenOwnable} from "./ITokenOwnable.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {TokenOwnableBase} from "./TokenOwnableBase.sol";

contract TokenOwnableFacet is ITokenOwnable, TokenOwnableBase, Facet {
  function __TokenOwnable_init(
    TokenOwnable memory tokenOwnable
  ) external onlyInitializing {
    __TokenOwnableBase_init(tokenOwnable);
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
