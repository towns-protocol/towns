// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

// contracts
import {BaseApp} from "./BaseApp.sol";

contract SimpleApp is BaseApp {
    string internal _moduleId;
    bytes32[] internal _permissions;

    constructor(string memory id, bytes32[] memory permissions) {
        _moduleId = id;
        _permissions = permissions;
    }

    function moduleId() external view returns (string memory) {
        return _moduleId;
    }

    function executionManifest() external pure returns (ExecutionManifest memory) {}

    function requiredPermissions() external view returns (bytes32[] memory) {
        return _permissions;
    }
}
