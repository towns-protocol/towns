// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

/**
 * @author  HNT Labs
 * @title   Events, Errors, and Enums for AccessControlListBase.
 */

interface IAccessControlListBase {
  /**
   * @notice  Enum for the acl status of a validator.
   * @dev     Unrecognized: Validator is neither allowlisted nor blocklisted.
   * @dev     Allowlisted: Validator is allowlisted.
   * @dev     Blocklisted: Validator was allowlisted, then blocklisted.
   */
  enum AccessControlStatus {
    Unrecognized,
    Allowlisted,
    Blocklisted
  }

  /**
   * @notice  Reverted because the expected validator status was AccessControlStatus.Unrecognized.
   */
  error AccessControlList__NotUnrecognized();

  /**
   * @notice  Reverted because the expected validator status was AccessControlStatus.Allowlisted.
   */
  error AccessControlList__NotAllowlisted();

  /**
   * @notice  Reverted because the validator was already blocklisted.
   */
  error AccessControlList__AlreadyBlocklisted();

  /**
   * @notice  Emitted when a validator is added to the allowlist.
   * @param   validator  Address of the validator added to the allowlist.
   */
  event AddedToAllowlist(address validator);

  /**
   * @notice  Emitted when a validator is removed from the allowlist.
   * @param   validator  Address of the validator removed from the allowlist.
   */
  event RemovedFromAllowlist(address validator);

  /**
   * @notice  Emitted when a validator is added to the blocklist.
   * @param   validator  Address of the validator added to the blocklist.
   */
  event AddedToBlocklist(address validator);
}

/**
 * @author  HNT Labs
 * @title   Interface for the AccessControlListFacet.
 */

interface IAccessControlList is IAccessControlListBase {
  function addToAllowlist(address _validator) external;

  function removeFromAllowlist(address _validator) external;

  function addToBlocklist(address _validator) external;

  function accessControlStatus(
    address _validator
  ) external view returns (AccessControlStatus);
}
