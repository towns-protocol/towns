// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {INodeStatus} from "./INodeStatus.sol";
import {NodeStatusBase} from "./NodeStatusBase.sol";
import {NodeRegistryBase} from "../registry/NodeRegistryBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

/**
 * @author  HNT Labs
 * @title   Service Status Facet for the Node Network Diamond.
 * @dev     Service Status determines the current standing of a node.
 * @dev     This contract handles the reads and writes to the Service Status storage.
 * @dev     Service Status is determined through a combination of signals, current block number, node registry and ACL status.
 * @dev     This is why NodeStatusFacet needs to make user of NodeRegistryBase and AccessControlListBase through NodeStatusBase.
 */

contract NodeStatusFacet is INodeStatus, NodeStatusBase, Facet {
  /// @dev  Initializes the NodeStatusFacet.
  function __NodeStatus_init() external onlyInitializing {
    __NodeStatus_init_unchained();
  }

  function __NodeStatus_init_unchained() internal {
    _addInterface(type(INodeStatus).interfaceId);
  }

  /**
   * @notice  Signals intent to enter the network.
   * @param   _validator  Address of the validator to signal intent to enter.
   */
  function signalIntentToEnter(
    address _validator
  ) external onlyOperator(_validator) {
    _signalIntentToEnter(_validator);
  }

  /**
   * @notice  Signals intent to activate.
   * @param   _validator  Address of the validator to signal intent to activate.
   */
  function signalIntentToActivate(
    address _validator
  ) external onlyOperator(_validator) {
    _signalIntentToActivate(_validator);
  }

  /**
   * @notice  Signals intent to crash.
   * @param   _validator  Address of the validator to signal intent to crash.
   */
  function signalIntentToCrash(
    address _validator
  ) external onlyOperator(_validator) {
    _signalIntentToCrash(_validator);
  }

  /**
   * @notice  Signals intent to exit.
   * @param   _validator  Address of the validator to signal intent to exit.
   */
  function signalIntentToExit(
    address _validator
  ) external onlyOperator(_validator) {
    _signalIntentToExit(_validator);
  }

  /**
   * @notice  Used to check the service status of a validator.
   * @param   _validator  Address of the validator to check.
   * @return  NodeStatus  Final service status of `_validator`.
   */
  function getStatus(address _validator) external view returns (NodeStatus) {
    return _getNodeStatus(_validator);
  }
}
