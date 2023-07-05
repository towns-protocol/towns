// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IProxyManager} from "./IProxyManager.sol";

// libraries
import {ProxyManagerController} from "./ProxyManagerController.sol";
import {OwnableController} from "contracts/src/diamond/facets/ownable/OwnableController.sol";
import {Initializable} from "contracts/src/diamond/facets/initializable/Initializable.sol";

// contracts

contract ProxyManager is
  ProxyManagerController,
  OwnableController,
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
