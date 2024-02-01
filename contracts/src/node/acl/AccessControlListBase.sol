// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {IAccessControlListBase} from "./IAccessControlList.sol";
import {AccessControlListStorage} from "./AccessControlListStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @author  HNT Labs
 * @title   Abstract base contract for AccessControlListFacet.
 * @dev     This abstract contract is additionally inherited by ServiceStatusBase.
 */

abstract contract AccessControlListBase is IAccessControlListBase {
  /**
   * @notice  Adds `_validator` to the allowlist.
   * @dev     Reverts if `_validator` is already allowlisted or blocklisted.
   * @param   _validator  Address of the validator to add to the allowlist.
   */
  function _addToAllowlist(address _validator) internal {
    if (_accessControlStatus(_validator) != AccessControlStatus.Unrecognized)
      revert AccessControlList__NotUnrecognized();
    AccessControlListStorage.Layout storage ds = AccessControlListStorage
      .layout();
    EnumerableSet.add(ds.allowlistSet, _validator);
    emit AddedToAllowlist(_validator);
  }

  /**
   * @notice  Removes `_validator` from the allowlist.
   * @dev     Reverts if `_validator` is not allowlisted.
   * @param   _validator  Address of the validator to remove from the allowlist.
   */
  function _removeFromAllowlist(address _validator) internal {
    if (_accessControlStatus(_validator) != AccessControlStatus.Allowlisted)
      revert AccessControlList__NotAllowlisted();
    AccessControlListStorage.Layout storage ds = AccessControlListStorage
      .layout();
    EnumerableSet.remove(ds.allowlistSet, _validator);
    emit RemovedFromAllowlist(_validator);
  }

  /**
   * @notice  Adds `_validator` to the blocklist.
   * @dev     Reverts if `_validator` is anything other than allowlisted.
   * @dev     Once a validator is blocklisted, it cannot be allowlisted again.
   * @param   _validator  Address of the validator to add to the blocklist.
   */
  function _addToBlocklist(address _validator) internal {
    if (_accessControlStatus(_validator) == AccessControlStatus.Blocklisted)
      revert AccessControlList__AlreadyBlocklisted();
    AccessControlListStorage.Layout storage ds = AccessControlListStorage
      .layout();
    EnumerableSet.add(ds.blocklistSet, _validator);
    emit AddedToBlocklist(_validator);
  }

  /**
   * @notice  Used to check the acl status of a validator.
   * @dev     If `_validator` is allowlisted and blocklisted, blocklist status takes precedence.
   * @param   _validator  Address of the validator to check.
   * @return  AccessControlStatus  Final ACL status of `_validator`.
   */
  function _accessControlStatus(
    address _validator
  ) internal view returns (AccessControlStatus) {
    AccessControlListStorage.Layout storage ds = AccessControlListStorage
      .layout();
    if (EnumerableSet.contains(ds.blocklistSet, _validator)) {
      return AccessControlStatus.Blocklisted;
    } else if (EnumerableSet.contains(ds.allowlistSet, _validator)) {
      return AccessControlStatus.Allowlisted;
    } else {
      return AccessControlStatus.Unrecognized;
    }
  }
}
