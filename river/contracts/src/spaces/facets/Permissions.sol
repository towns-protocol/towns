// SPDX-License-Identifier: MIT
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
  string public constant Write = "Write";
  string public constant Ping = "Ping";
}
