// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

/**
 * @title  Enum that encapsulates Service Status Signals.
 * @dev    NIL: No signal. This is the default state.
 * @dev    ENTER: Signal to enter the network. Signaling this will set the activation deadline.
 * @dev    ACTIVATE: Signal to activate. Signaling this will hold the validator accountable to start serving by service start block number.
 * @dev    EXIT: Signal to exit. Signaling this will begin the validator cooldown.
 * @dev    CRASH: Signal to crash. This is an irreversible and voluntary signal, where the operator can signal that the validator has crashed and is no longer serving.
 */
enum NodeStatusSignal {
  NIL,
  ENTER,
  ACTIVATE,
  EXIT,
  CRASH
}

/**
 * @author  HNT Labs
 * @title   Data Storage for Service Status.
 * @dev     NodeStatusBase is the only contract that uses this library.
 * @dev     NodeStatusFacet, through NodeStatusBase, makes use of this library.
 */

library NodeStatusStorage {
  // solhint-disable-next-line private-vars-leading-underscore
  bytes32 internal constant STORAGE_POSITION =
    keccak256("river.node.status.storage");

  struct Layout {
    mapping(address => NodeStatusSignal) NodeStatusSignal;
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
