// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISimpleApp} from "src/apps/helpers/ISimpleApp.sol";
// libraries

// contracts
import {BaseApp} from "src/apps/BaseApp.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Initializable} from "solady/utils/Initializable.sol";

// libraries
import {SimpleAppStorage} from "src/apps/helpers/SimpleAppStorage.sol";

contract SimpleApp is ISimpleApp, Ownable, BaseApp, Initializable {
    using SimpleAppStorage for SimpleAppStorage.Layout;

    function initialize(
        address owner,
        string calldata appId,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration
    ) external initializer {
        _setOwner(owner);
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        $.name = appId;
        $.permissions = permissions;
        $.installPrice = installPrice;
        $.accessDuration = accessDuration;
    }

    /// @notice Updates the pricing of the app
    /// @param installPrice The new install price
    /// @param accessDuration The new access duration
    function updatePricing(uint256 installPrice, uint48 accessDuration) external onlyOwner {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        $.installPrice = installPrice;
        $.accessDuration = accessDuration;
    }

    /// @notice Returns the required permissions for the app
    /// @return permissions The required permissions for the app
    function requiredPermissions() external view returns (bytes32[] memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.permissions;
    }

    /// @notice Returns the ID of the app
    /// @return name The ID of the app
    function moduleId() public view returns (string memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.name;
    }

    /// @notice Returns the execution manifest for the app
    /// @return manifest The execution manifest for the app
    function executionManifest() external pure returns (ExecutionManifest memory) {
        // solhint-disable no-empty-blocks
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           OVERRIDES                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _installPrice() internal view override returns (uint256) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.installPrice;
    }

    function _accessDuration() internal view override returns (uint48) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.accessDuration;
    }

    function _moduleOwner() internal view override returns (address) {
        return owner();
    }
}
