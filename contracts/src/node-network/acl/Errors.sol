//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

library Errors {
  /**
   * @notice  Reverted because the expected validator status was AccessControlStatus.Unrecognized.
   */
  error NotUnrecognized();

  /**
   * @notice  Reverted because the expected validator status was AccessControlStatus.Allowlisted.
   */
  error NotAllowlisted();

  /**
   * @notice  Reverted because the validator was already blocklisted.
   */
  error AlreadyBlocklisted();
}
