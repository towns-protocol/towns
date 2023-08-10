// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

/**
 * @title The ERC-2771 Recipient Base Abstract Class - Declarations
 *
 * @notice A contract must implement this interface in order to support relayed transaction.
 *
 * @notice It is recommended that your contract inherits from the ERC2771Recipient abstract contract.
 */
interface IERC2771Recipient {
  /**
   * :warning: **Warning** :warning: The Forwarder can have a full control over your Recipient. Only trust verified Forwarder.
   * @param forwarder The address of the Forwarder contract that is being used.
   * @return isTrustedForwarder `true` if the Forwarder is trusted to forward relayed transactions by this Recipient.
   */
  function isTrustedForwarder(address forwarder) external view returns (bool);
}
