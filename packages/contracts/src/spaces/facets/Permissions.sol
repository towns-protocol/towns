// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library Permissions {
    string internal constant ModifyChannel = "ModifyChannel";
    string internal constant AddRemoveChannels = "AddRemoveChannels";
    string internal constant ModifySpaceSettings = "ModifySpaceSettings";
    string internal constant ModifyRoles = "ModifyRoles";
    string internal constant JoinSpace = "JoinSpace";
    string internal constant ModifyBanning = "ModifyBanning";
    string internal constant Read = "Read";
    string internal constant Write = "Write";
    string internal constant React = "React";
    string internal constant Ping = "Ping";
    string internal constant ModifyAppSettings = "ModifyAppSettings";
}
