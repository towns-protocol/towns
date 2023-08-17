// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {ManagedProxyBase} from "contracts/src/diamond/proxy/managed/ManagedProxyBase.sol";
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {Multicall} from "contracts/src/diamond/utils/multicall/Multicall.sol";

contract TownProxy is ManagedProxyBase, TokenOwnableBase, Multicall {
  constructor(
    bytes4 managerSelector,
    address manager,
    address townToken,
    uint256 tokenId
  ) {
    __ManagedProxyBase_init(managerSelector, manager);
    __TokenOwnableBase_init(townToken, tokenId);
  }

  receive() external payable {}
}
