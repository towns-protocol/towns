// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {IAccessControlList, AccessControlStatus} from "./IAccessControlList.sol";
import {AccessControlListBase} from "./AccessControlListBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

/**
 * @author  HNT Labs
 * @title   ACL Facet for the Node Network Diamond.
 * @dev     This contract contains the external functions for managing the ACL.
 */

contract AccessControlListFacet is
  IAccessControlList,
  AccessControlListBase,
  OwnableBase,
  Facet
{
  /**
   * @notice  Adds `_validator` to the allowlist.
   * @param   _validator  Address of the validator to add to the allowlist.
   */
  function addToAllowlist(address _validator) external onlyOwner {
    _addToAllowlist(_validator);
  }

  /**
   * @notice  Removes `_validator` from the allowlist.
   * @param   _validator  Address of the validator to remove from the allowlist.
   */
  function removeFromAllowlist(address _validator) external onlyOwner {
    _removeFromAllowlist(_validator);
  }

  /**
   * @notice  Adds `_validator` to the blocklist.
   * @param   _validator  Address of the validator to add to the blocklist.
   */
  function addToBlocklist(address _validator) external onlyOwner {
    _addToBlocklist(_validator);
  }

  /**
   * @notice  Used to check the acl status of a validator.
   * @param   _validator  Address of the validator to check.
   * @return  AccessControlStatus  Final ACL status of `_validator`.
   */
  function accessControlStatus(
    address _validator
  ) external view returns (AccessControlStatus) {
    return _accessControlStatus(_validator);
  }
}
