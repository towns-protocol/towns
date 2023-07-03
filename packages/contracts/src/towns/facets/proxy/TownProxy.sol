// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {TownProxyController} from "./TownProxyController.sol";
import {ManagedProxyController} from "contracts/src/diamond/proxy/managed/ManagedProxyController.sol";
import {TokenOwnable} from "contracts/src/diamond/extensions/ownable/token/TokenOwnable.sol";
import {TokenPausable} from "contracts/src/diamond/extensions/pausable/token/TokenPausable.sol";
import {Multicall} from "contracts/src/diamond/utils/multicall/Multicall.sol";

contract TownProxy is
  TownProxyController,
  ManagedProxyController,
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
