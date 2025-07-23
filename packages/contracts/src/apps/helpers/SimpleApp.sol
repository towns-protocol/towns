// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISimpleApp} from "../../apps/helpers/ISimpleApp.sol";
import {ITownsApp} from "../../apps/ITownsApp.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

// contracts
import {BaseApp} from "../../apps/BaseApp.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Initializable} from "solady/utils/Initializable.sol";

// libraries
import {SimpleAppStorage} from "../../apps/helpers/SimpleAppStorage.sol";
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../utils/libraries/CurrencyTransfer.sol";

contract SimpleApp is ISimpleApp, Ownable, BaseApp, Initializable {
    using CustomRevert for bytes4;
    using SimpleAppStorage for SimpleAppStorage.Layout;

    /// @inheritdoc ISimpleApp
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

    /// @inheritdoc ISimpleApp
    function withdrawETH(address recipient) external onlyOwner {
        if (recipient == address(0)) ZeroAddress.selector.revertWith();

        uint256 balance = address(this).balance;
        if (balance == 0) NoBalanceToWithdraw.selector.revertWith();

        CurrencyTransfer.safeTransferNativeToken(recipient, balance);

        emit Withdrawal(recipient, balance);
    }

    /// @inheritdoc ISimpleApp
    function updatePricing(uint256 installPrice, uint48 accessDuration) external onlyOwner {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();

        $.installPrice = installPrice;
        $.accessDuration = accessDuration;

        emit PricingUpdated(installPrice, accessDuration);
    }

    /// @inheritdoc ITownsApp
    function requiredPermissions() external view returns (bytes32[] memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.permissions;
    }

    /// @inheritdoc IERC6900Module
    function moduleId() public view returns (string memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.name;
    }

    /// @inheritdoc IERC6900ExecutionModule
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
