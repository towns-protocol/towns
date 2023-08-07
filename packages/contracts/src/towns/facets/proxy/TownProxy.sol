// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {TownProxyBase} from "./TownProxyBase.sol";
import {ManagedProxyBase} from "contracts/src/diamond/proxy/managed/ManagedProxyBase.sol";
import {TokenOwnableFacet} from "contracts/src/diamond/facets/ownable/token/TokenOwnableFacet.sol";
import {TokenPausableFacet} from "contracts/src/diamond/facets/pausable/token/TokenPausableFacet.sol";
import {Multicall} from "contracts/src/diamond/utils/multicall/Multicall.sol";

contract TownProxy is
  TownProxyBase,
  ManagedProxyBase,
  TokenOwnableFacet,
  TokenPausableFacet,
  Multicall
{
  constructor(
    bytes4 managerSelector,
    address manager,
    string memory networkId,
    address townToken,
    uint256 tokenId
  ) {
    _setManagerSelector(managerSelector);
    _setManager(manager);

    _setNetworkId(networkId);
    _setCreatedAt();

    _setOwnership(townToken, tokenId);

    _unpause();
  }

  receive() external payable {}
}
