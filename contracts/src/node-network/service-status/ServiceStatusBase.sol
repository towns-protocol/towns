// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {AccessControlListBase, AccessControlStatus} from "../acl/AccessControlListBase.sol";
import {NodeRegistryBase} from "../registry/NodeRegistryBase.sol";
import {IServiceStatusBase, ServiceStatus} from "./IServiceStatus.sol";
import {ServiceStatusStorage, ServiceStatusSignal} from "./ServiceStatusStorage.sol";

/**
 * @author  HNT Labs
 * @title   Abstract base contract for ServiceStatusFacet.
 */

abstract contract ServiceStatusBase is
  IServiceStatusBase,
  AccessControlListBase,
  NodeRegistryBase
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
    ServiceStatus status = _getServiceStatus(_validator);
    if (status != ServiceStatus.DORMANT)
      revert ServiceStatusBase__InvalidSignal();

    ServiceStatusStorage.Layout storage ds = ServiceStatusStorage.layout();

    ds.serviceStatusSignal[_validator] = ServiceStatusSignal.ENTER;
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
    ServiceStatus status = _getServiceStatus(_validator);
    if (status != ServiceStatus.PENDING_ENTRY)
      revert ServiceStatusBase__InvalidSignal();

    ServiceStatusStorage.Layout storage ds = ServiceStatusStorage.layout();

    ds.serviceStatusSignal[_validator] = ServiceStatusSignal.ACTIVATE;

    emit IntentToActivateSignaled(_validator);
  }

  /**
   * @notice  Signals intent to crash. Crash is a voluntary signal, and can be called at any time.
   * @param   _validator  Address of the validator to signal intent to crash.
   * @dev     Can only be called by the operator via the facet.
   * @dev     Can only be called if the validator is ACTIVE, PENDING_ACTIVE, or PENDING_EXIT. This means they're currently serving.
   */
  function _signalIntentToCrash(address _validator) internal {
    ServiceStatus status = _getServiceStatus(_validator);
    bool mayCrash = status == ServiceStatus.ACTIVE ||
      status == ServiceStatus.PENDING_ACTIVE ||
      status == ServiceStatus.PENDING_EXIT;
    if (!mayCrash) revert ServiceStatusBase__InvalidSignal();
    ServiceStatusStorage.Layout storage ds = ServiceStatusStorage.layout();

    ds.serviceStatusSignal[_validator] = ServiceStatusSignal.CRASH;
    emit IntentToCrashSignaled(_validator);
  }

  /**
   * @notice  Signals intent to exit.
   * @param   _validator  Address of the validator to signal intent to exit.
   * @dev     Can only be called by the operator via the facet.
   * @dev     Can only be called if the validator is ACTIVE. This means they're currently serving, and have not signaled intent to exit yet.
   */
  function _signalIntentToExit(address _validator) internal {
    ServiceStatus status = _getServiceStatus(_validator);
    if (status != ServiceStatus.ACTIVE)
      revert ServiceStatusBase__InvalidSignal();
    ServiceStatusStorage.Layout storage ds = ServiceStatusStorage.layout();

    ds.serviceStatusSignal[_validator] = ServiceStatusSignal.EXIT;
    ds.exitingServiceAt[_validator] = block.number + SERVICE_EXIT_BLOCKS;
    emit IntentToExitSignaled(_validator);
  }

  /**
   * @notice  Returns the current status of the validator.
   * @param   _validator  Address of the validator to check.
   * @return  status  The current service status of the validator.
   */
  function _getServiceStatus(
    address _validator
  ) internal view returns (ServiceStatus) {
    ServiceStatusStorage.Layout storage ds = ServiceStatusStorage.layout();
    AccessControlStatus accessControlStatus = _accessControlStatus(_validator);

    if (accessControlStatus == AccessControlStatus.Blocklisted) {
      return ServiceStatus.KICKED;
    } else if (
      accessControlStatus == AccessControlStatus.Unrecognized ||
      _isInOperation(_validator) == false
    ) {
      return ServiceStatus.EXCLUDED;
    }
    ServiceStatusSignal lastSignal = ds.serviceStatusSignal[_validator];
    if (lastSignal == ServiceStatusSignal.ENTER) {
      if (block.number >= ds.activationDeadline[_validator]) {
        return ServiceStatus.FAILED_ENTRY;
      } else {
        return ServiceStatus.PENDING_ENTRY;
      }
    } else if (lastSignal == ServiceStatusSignal.ACTIVATE) {
      if (block.number >= ds.startingServiceAt[_validator]) {
        return ServiceStatus.ACTIVE;
      } else {
        return ServiceStatus.PENDING_ACTIVE;
      }
    } else if (lastSignal == ServiceStatusSignal.EXIT) {
      if (block.number >= ds.exitingServiceAt[_validator]) {
        return ServiceStatus.EXITED;
      } else {
        return ServiceStatus.PENDING_EXIT;
      }
    } else if (lastSignal == ServiceStatusSignal.CRASH) {
      return ServiceStatus.CRASHED;
    } else {
      return ServiceStatus.DORMANT;
    }
  }
}
