// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Permissions {
  string public constant Read = "Read";
  string public constant Write = "Write";
  string public constant Invite = "Invite";
  string public constant Redact = "Redact";
  string public constant Ban = "Ban";
  string public constant Ping = "Ping";
  string public constant PinMessage = "PinMessage";
  string public constant ModifyChannelPermissions = "ModifyChannelPermissions";
  string public constant ModifyProfile = "ModifyProfile";
  string public constant Owner = "Owner";
  string public constant AddRemoveChannels = "AddRemoveChannels";
  string public constant ModifySpacePermissions = "ModifySpacePermissions";
  string public constant ModifyChannelDefaults = "ModifyChannelDefaults";
  string public constant Upgrade = "Upgrade";
}
