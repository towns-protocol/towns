// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library Permissions {
  string public constant ModifyChannel = "ModifyChannel";
  string public constant AddRemoveChannels = "AddRemoveChannels";
  string public constant ModifySpaceSettings = "ModifySpaceSettings";
  string public constant ModifyRoles = "ModifyRoles";
  string public constant JoinSpace = "JoinSpace";
  string public constant ModifyBanning = "ModifyBanning";
  string public constant Read = "Read";
  string public constant Write = "Write";
  string public constant React = "React";
  string public constant Ping = "Ping";
}
