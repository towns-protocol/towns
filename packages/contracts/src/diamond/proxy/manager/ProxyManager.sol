// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IProxyManager} from "./IProxyManager.sol";

// libraries
import {ProxyManagerBase} from "./ProxyManagerBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Initializable} from "contracts/src/diamond/facets/initializable/Initializable.sol";

// contracts

contract ProxyManager is
  ProxyManagerBase,
  OwnableBase,
  Initializable,
  IProxyManager
{
  function getImplementation(
    bytes4 selector
  ) external view virtual returns (address) {
    return _getImplementation(selector);
  }

  function setImplementation(
    address implementation
  ) external virtual onlyOwner {
    _setImplementation(implementation);
  }
}
