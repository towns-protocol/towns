// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDelegation} from "./IDelegation.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {DelegationBase} from "./DelegationBase.sol";

contract Delegation is IDelegation, DelegationBase, Facet {
  function __Delegation_init() external onlyInitializing {
    _addInterface(type(IDelegation).interfaceId);
  }

  /**
   * @inheritdoc IDelegation
   */
  function delegateForAll(address delegate, bool value) external {
    _delegateForAll(delegate, value);
  }

  /**
   * @inheritdoc IDelegation
   */
  function revokeAllDelegates() external {
    _revokeAllDelegates();
  }

  /**
   * @inheritdoc IDelegation
   */
  function revokeDelegate(address delegate) external {
    _revokeDelegate(delegate, msg.sender);
  }

  /*
   * @inheritdoc IDelegation
   */
  function getDelegationsByDelegate(
    address delegate
  ) external view returns (DelegationInfo[] memory info) {
    return _getDelegationsByDelegate(delegate);
  }

  /**
   * @inheritdoc IDelegation
   */
  function getDelegatesForAll(
    address vault
  ) external view returns (address[] memory delegates) {
    return _getDelegatesFor(vault);
  }

  /**
   * @inheritdoc IDelegation
   */
  function checkDelegateForAll(
    address delegate,
    address vault
  ) external view returns (bool) {
    return _checkDelegateForAll(delegate, vault);
  }
}
