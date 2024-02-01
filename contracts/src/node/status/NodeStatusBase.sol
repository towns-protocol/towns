// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {AccessControlListBase} from "../acl/AccessControlListBase.sol";

import {INodeStatusBase} from "./INodeStatus.sol";
import {NodeStatusStorage, NodeStatusSignal} from "./NodeStatusStorage.sol";

import {NodeModifiers} from "../NodeModifiers.sol";

/**
 * @author  HNT Labs
 * @title   Abstract base contract for NodeStatusFacet.
 */

abstract contract NodeStatusBase is
  INodeStatusBase,
  NodeModifiers,
  AccessControlListBase
{
  /**
   * @dev  When a validator signals intent to enter the network, is has to signal intent to activate within this many blocks.
   */
  uint256 public constant ACTIVATION_DEADLINE_BLOCKS = 256;

  /**
   * @dev  A validator has this many blocks after activation deadline to start serving.
   */
  uint256 public constant SERVICE_START_BLOCKS = 256;

  /**
   * @dev  A validator has to keep serving for this many blocks after signaling intent to exit.
   */
  uint256 public constant SERVICE_EXIT_BLOCKS = 256;

  /**
   * @notice  Signals intent to enter the network.
   * @param   _validator  Address of the validator to signal intent to enter.
   * @dev     Can only be called by the operator via the facet.
   * @dev     Can only be called if the validator is DORMANT. This means they're allowlisted, but not yet in the network.
   */
  function _signalIntentToEnter(address _validator) internal {
    NodeStatus status = _getNodeStatus(_validator);
    if (status != NodeStatus.DORMANT) revert NodeStatusBase__InvalidSignal();

    NodeStatusStorage.Layout storage ds = NodeStatusStorage.layout();

    ds.NodeStatusSignal[_validator] = NodeStatusSignal.ENTER;
    ds.activationDeadline[_validator] =
      block.number +
      ACTIVATION_DEADLINE_BLOCKS;
    ds.startingServiceAt[_validator] =
      block.number +
      ACTIVATION_DEADLINE_BLOCKS +
      SERVICE_START_BLOCKS;

    emit IntentToEnterSignaled(_validator);
  }

  /**
   * @notice  Signals intent to activate.
   * @param   _validator  Address of the validator to signal intent to activate.
   * @dev     Can only be called by the operator via the facet.
   * @dev     Can only be called if the validator is PENDING_ENTRY. This means they've signaled intent to enter, but haven't activated yet.
   */
  function _signalIntentToActivate(address _validator) internal {
    NodeStatus status = _getNodeStatus(_validator);
    if (status != NodeStatus.PENDING_ENTRY)
      revert NodeStatusBase__InvalidSignal();

    NodeStatusStorage.Layout storage ds = NodeStatusStorage.layout();

    ds.NodeStatusSignal[_validator] = NodeStatusSignal.ACTIVATE;

    emit IntentToActivateSignaled(_validator);
  }

  /**
   * @notice  Signals intent to crash. Crash is a voluntary signal, and can be called at any time.
   * @param   _validator  Address of the validator to signal intent to crash.
   * @dev     Can only be called by the operator via the facet.
   * @dev     Can only be called if the validator is ACTIVE, PENDING_ACTIVE, or PENDING_EXIT. This means they're currently serving.
   */
  function _signalIntentToCrash(address _validator) internal {
    NodeStatus status = _getNodeStatus(_validator);
    bool mayCrash = status == NodeStatus.ACTIVE ||
      status == NodeStatus.PENDING_ACTIVE ||
      status == NodeStatus.PENDING_EXIT;
    if (!mayCrash) revert NodeStatusBase__InvalidSignal();
    NodeStatusStorage.Layout storage ds = NodeStatusStorage.layout();

    ds.NodeStatusSignal[_validator] = NodeStatusSignal.CRASH;
    emit IntentToCrashSignaled(_validator);
  }

  /**
   * @notice  Signals intent to exit.
   * @param   _validator  Address of the validator to signal intent to exit.
   * @dev     Can only be called by the operator via the facet.
   * @dev     Can only be called if the validator is ACTIVE. This means they're currently serving, and have not signaled intent to exit yet.
   */
  function _signalIntentToExit(address _validator) internal {
    NodeStatus status = _getNodeStatus(_validator);
    if (status != NodeStatus.ACTIVE) revert NodeStatusBase__InvalidSignal();
    NodeStatusStorage.Layout storage ds = NodeStatusStorage.layout();

    ds.NodeStatusSignal[_validator] = NodeStatusSignal.EXIT;
    ds.exitingServiceAt[_validator] = block.number + SERVICE_EXIT_BLOCKS;
    emit IntentToExitSignaled(_validator);
  }

  /**
   * @notice  Returns the current status of the validator.
   * @param   _validator  Address of the validator to check.
   * @return  status  The current service status of the validator.
   */
  function _getNodeStatus(
    address _validator
  ) internal view returns (NodeStatus) {
    NodeStatusStorage.Layout storage ds = NodeStatusStorage.layout();
    AccessControlStatus accessControlStatus = _accessControlStatus(_validator);

    if (accessControlStatus == AccessControlStatus.Blocklisted) {
      return NodeStatus.KICKED;
    } else if (
      accessControlStatus == AccessControlStatus.Unrecognized ||
      _isInOperation(_validator) == false
    ) {
      return NodeStatus.EXCLUDED;
    }
    NodeStatusSignal lastSignal = ds.NodeStatusSignal[_validator];
    if (lastSignal == NodeStatusSignal.ENTER) {
      if (block.number >= ds.activationDeadline[_validator]) {
        return NodeStatus.FAILED_ENTRY;
      } else {
        return NodeStatus.PENDING_ENTRY;
      }
    } else if (lastSignal == NodeStatusSignal.ACTIVATE) {
      if (block.number >= ds.startingServiceAt[_validator]) {
        return NodeStatus.ACTIVE;
      } else {
        return NodeStatus.PENDING_ACTIVE;
      }
    } else if (lastSignal == NodeStatusSignal.EXIT) {
      if (block.number >= ds.exitingServiceAt[_validator]) {
        return NodeStatus.EXITED;
      } else {
        return NodeStatus.PENDING_EXIT;
      }
    } else if (lastSignal == NodeStatusSignal.CRASH) {
      return NodeStatus.CRASHED;
    } else {
      return NodeStatus.DORMANT;
    }
  }
}
