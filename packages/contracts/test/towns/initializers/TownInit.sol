// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {TownProxyService} from "contracts/src/towns/facets/proxy/TownProxyService.sol";
import {TokenOwnableService} from "contracts/src/diamond/extensions/ownable/token/TokenOwnableService.sol";
import {Initializable} from "contracts/src/diamond/extensions/initializable/Initializable.sol";

/// @notice This contract is used to initialize the Town contract in testing
contract TownInit is Initializable {
  function init(
    string memory networkId,
    address tokenAddress,
    uint256 tokenId
  ) external initializer {
    TokenOwnableService.initialize(tokenAddress, tokenId);
    TownProxyService.setNetworkId(networkId);
  }
}
