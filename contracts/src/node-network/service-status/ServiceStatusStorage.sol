// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;
import {IServiceStatusBase} from "./IServiceStatus.sol";

/**
 * @title  Enum that encapsulates Service Status Signals.
 * @dev    NIL: No signal. This is the default state.
 * @dev    ENTER: Signal to enter the network. Signaling this will set the activation deadline.
 * @dev    ACTIVATE: Signal to activate. Signaling this will hold the validator accountable to start serving by service start block number.
 * @dev    EXIT: Signal to exit. Signaling this will begin the validator cooldown.
 * @dev    CRASH: Signal to crash. This is an irreversible and voluntary signal, where the operator can signal that the validator has crashed and is no longer serving.
 */
enum ServiceStatusSignal {
  NIL,
  ENTER,
  ACTIVATE,
  EXIT,
  CRASH
}

/**
 * @author  HNT Labs
 * @title   Data Storage for Service Status.
 * @dev     ServiceStatusBase is the only contract that uses this library.
 * @dev     ServiceStatusFacet, through ServiceStatusBase, makes use of this library.
 */

library ServiceStatusStorage {
  // solhint-disable-next-line private-vars-leading-underscore
  bytes32 internal constant STORAGE_POSITION =
    keccak256("towns.node-network.service-status.ServiceStatusStorage");

  struct Layout {
    mapping(address => ServiceStatusSignal) serviceStatusSignal;
    mapping(address => uint256) activationDeadline;
    mapping(address => uint256) startingServiceAt;
    mapping(address => uint256) exitingServiceAt;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_POSITION;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := slot
    }
  }
}
