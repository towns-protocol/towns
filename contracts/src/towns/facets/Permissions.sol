// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library Permissions {
  // Channels
  string internal constant CreateChannel = "CreateChannel";
  string internal constant UpdateChannel = "UpdateChannel";
  string internal constant RemoveChannel = "RemoveChannel";
  string internal constant AddRoleToChannel = "AddRoleToChannel";
  string internal constant RemoveRoleFromChannel = "RemoveRoleFromChannel";

  // Roles
  string internal constant CreateRole = "CreateRole";
  string internal constant UpdateRole = "UpdateRole";
  string internal constant RemoveRole = "RemoveRole";
  string internal constant AddPermissionsToRole = "AddPermissionsToRole";
  string internal constant RemovePermissionsFromRole =
    "RemovePermissionsFromRole";
  string internal constant AddRoleToEntitlement = "AddRoleToEntitlement";
  string internal constant RemoveRoleFromEntitlement =
    "RemoveRoleFromEntitlement";

  // Acces
  string internal constant Write = "Write";
  string internal constant Read = "Read";
}
