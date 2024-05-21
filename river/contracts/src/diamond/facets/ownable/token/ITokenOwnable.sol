// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {IERC173, IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

interface ITokenOwnableBase is IOwnableBase {
  struct TokenOwnable {
    address collection;
    uint256 tokenId;
  }
}

interface ITokenOwnable is ITokenOwnableBase, IERC173 {}
