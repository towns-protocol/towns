// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {BaseApp} from "src/apps/BaseApp.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Initializable} from "solady/utils/Initializable.sol";
import {UUPSUpgradeable} from "solady/utils/UUPSUpgradeable.sol";

// libraries
import {SimpleAppStorage} from "src/apps/helpers/SimpleAppStorage.sol";

contract SimpleApp is Ownable, BaseApp, Initializable, UUPSUpgradeable {
    using SimpleAppStorage for SimpleAppStorage.Layout;

    function __SimpleApp_init(
        address owner,
        string memory appId,
        bytes32[] memory permissions
    ) external initializer {
        _setOwner(owner);
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        $.name = appId;
        $.permissions = permissions;
    }

    function moduleId() public view returns (string memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.name;
    }

    function _moduleOwner() internal view override returns (address) {
        return owner();
    }

    function requiredPermissions() external view returns (bytes32[] memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.permissions;
    }

    function executionManifest() external pure returns (ExecutionManifest memory) {
        // solhint-disable no-empty-blocks
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
