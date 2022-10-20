// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library PermissionTypes {
  bytes32 public constant Read = keccak256("Read");
  bytes32 public constant Write = keccak256("Write");
  bytes32 public constant Invite = keccak256("Invite");
  bytes32 public constant Redact = keccak256("Redact");
  bytes32 public constant Ban = keccak256("Ban");
  bytes32 public constant Ping = keccak256("Ping");
  bytes32 public constant PinMessage = keccak256("PinMessage");
  bytes32 public constant ModifyChannelPermissions =
    keccak256("ModifyChannelPermissions");
  bytes32 public constant ModifyProfile = keccak256("ModifyProfile");
  bytes32 public constant Owner = keccak256("Owner");
  bytes32 public constant AddRemoveChannels = keccak256("AddRemoveChannels");
  bytes32 public constant ModifySpacePermissions =
    keccak256("ModifySpacePermissions");
  bytes32 public constant ModifyChannelDefaults =
    keccak256("ModifyChannelDefaults");
}
