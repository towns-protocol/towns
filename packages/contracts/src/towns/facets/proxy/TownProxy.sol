// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {TownProxyBase} from "./TownProxyBase.sol";
import {ManagedProxyBase} from "contracts/src/diamond/proxy/managed/ManagedProxyBase.sol";
import {TokenOwnable} from "contracts/src/diamond/facets/ownable/token/TokenOwnable.sol";
import {TokenPausable} from "contracts/src/diamond/facets/pausable/token/TokenPausable.sol";
import {Multicall} from "contracts/src/diamond/utils/multicall/Multicall.sol";

contract TownProxy is
  TownProxyBase,
  ManagedProxyBase,
  TokenOwnable,
  TokenPausable,
  Multicall
{
  constructor(
    bytes4 managerSelector,
    address manager,
    string memory networkId,
    address townToken,
    uint256 tokenId
  ) {
    __TownProxy_init(networkId);
    __ManagedProxy_init(managerSelector, manager);
    __Ownable_init(townToken, tokenId);
    __Pausable_init();
  }

  receive() external payable {}
}
