// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library Permissions {
  string public constant ModifyChannels = "AddRemoveChannels";
  string public constant ModifyRoles = "ModifySpaceSettings";
  string public constant JoinSpace = "JoinSpace";
  string public constant ModifyBanning = "ModifyBanning";
  string public constant Read = "Read";
}
