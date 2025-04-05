// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {PluginLib} from "./PluginLib.sol";
// types
import {ExecutionManifest} from
    "@erc6900/reference-implementation/src/interfaces/IERC6900ExecutionModule.sol";

// contracts

contract PluginManager {
    function installExecution(
        address plugin,
        ExecutionManifest calldata manifest,
        bytes calldata moduleInstallData
    )
        external
    {
        PluginLib.installExecution(plugin, manifest, moduleInstallData);
    }
}
