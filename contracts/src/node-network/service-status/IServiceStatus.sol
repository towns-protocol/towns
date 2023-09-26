// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

enum ServiceStatus {
  EXCLUDED, // can't activate on its own, needs to be included first.
  DORMANT, // has the potential to activate, but hasn't taken any action to do so.
  PENDING_ENTRY, // has initiated activation
  FAILED_ENTRY, // has attempted activation, but failed.
  PENDING_ACTIVE, // successfully activated, just waiting for its service start block number.
  ACTIVE, // successfully activated, and currently serving.
  PENDING_EXIT, // signaled exit, waiting for its service stop block number, still serving.
  EXITED, // successfully exited
  KICKED, // kicked out of the network
  CRASHED // voluntarily signaled crash
}

/**
 * @author  HNT Labs
 * @title   Enums, Events and Errors for the ServiceStatusBase contract.
 */

interface IServiceStatusBase {
  /**
   * @notice  Emitted when a validator signals intent to enter the network.
   * @param   validator  Address of the validator.
   */
  event IntentToEnterSignaled(address validator);

  /**
   * @notice  Emitted when a validator signals intent to activate.
   * @param   validator  Address of the validator.
   */
  event IntentToActivateSignaled(address validator);

  /**
   * @notice  Emitted when a validator signals intent to crash.
   * @param   validator  Address of the validator.
   */
  event IntentToCrashSignaled(address validator);

  /**
   * @notice  Emitted when a validator signals intent to exit.
   * @param   validator  Address of the validator.
   */
  event IntentToExitSignaled(address validator);

  /**
   * @notice  The current status does not allow the validator to signal this intent.
   */
  error ServiceStatusBase__InvalidSignal();
}

/**
 * @author HNT Labs
 * @title  Interface for the ServiceStatusFacet.
 */
interface IServiceStatus is IServiceStatusBase {
  function signalIntentToEnter(address _validator) external;

  function signalIntentToActivate(address _validator) external;

  function signalIntentToCrash(address _validator) external;

  function signalIntentToExit(address _validator) external;

  function getServiceStatus(
    address _validator
  ) external view returns (ServiceStatus);
}
