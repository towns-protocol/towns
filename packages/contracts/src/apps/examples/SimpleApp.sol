// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {BaseApp} from "../BaseApp.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

contract SimpleApp is Ownable, BaseApp {
    string internal _appId;
    bytes32[] internal _permissions;

    constructor(address owner, string memory appId, bytes32[] memory permissions) {
        _setOwner(owner);
        _appId = appId;
        _permissions = permissions;
    }

    function moduleId() public view returns (string memory) {
        return _appId;
    }

    function executionManifest() external pure returns (ExecutionManifest memory) {}

    function requiredPermissions() external view returns (bytes32[] memory) {
        return _permissions;
    }

    function _moduleOwner() internal view override returns (address) {
        return owner();
    }
}
