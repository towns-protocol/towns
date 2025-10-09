// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISimpleApp} from "../../apps/helpers/ISimpleApp.sol";
import {ITownsApp} from "../../apps/ITownsApp.sol";
import {ExecutionManifest, IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";

// contracts
import {BaseApp} from "../../apps/BaseApp.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {Initializable} from "solady/utils/Initializable.sol";

// libraries
import {SimpleAppStorage} from "../../apps/helpers/SimpleAppStorage.sol";
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../utils/libraries/CurrencyTransfer.sol";

contract SimpleApp is ISimpleApp, Ownable, BaseApp, Initializable {
    using CustomRevert for bytes4;
    using SimpleAppStorage for SimpleAppStorage.Layout;

    // External functions
    /// @inheritdoc ISimpleApp
    function initialize(
        address owner,
        string calldata appId,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration,
        address client
    ) external initializer {
        _setOwner(owner);
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        $.name = appId;
        $.permissions = permissions;
        $.installPrice = installPrice;
        $.accessDuration = accessDuration;
        $.client = client;
    }

    /// @inheritdoc ISimpleApp
    function withdrawETH(address recipient) external onlyOwner {
        if (recipient == address(0)) ZeroAddress.selector.revertWith();

        uint256 balance = address(this).balance;
        if (balance == 0) NoBalanceToWithdraw.selector.revertWith();

        CurrencyTransfer.safeTransferNativeToken(recipient, balance);

        emit Withdrawal(recipient, balance);
    }

    function sendCurrency(address recipient, address currency, uint256 amount) external {
        _checkAllowed();

        if (recipient == address(0)) ZeroAddress.selector.revertWith();
        if (currency == address(0)) currency = CurrencyTransfer.NATIVE_TOKEN;
        if (amount == 0) InvalidAmount.selector.revertWith();

        CurrencyTransfer.transferCurrency(currency, address(this), recipient, amount);

        emit SendCurrency(recipient, currency, amount);
    }

    /// @inheritdoc ISimpleApp
    function updatePricing(uint256 installPrice, uint48 accessDuration) external onlyOwner {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();

        $.installPrice = installPrice;
        $.accessDuration = accessDuration;

        emit PricingUpdated(installPrice, accessDuration);
    }

    /// @inheritdoc ISimpleApp
    function updatePermissions(bytes32[] calldata permissions) external onlyOwner {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        $.permissions = permissions;
        emit PermissionsUpdated(permissions);
    }

    /// @inheritdoc IExecutionModule
    function executionManifest() external pure returns (ExecutionManifest memory) {
        // solhint-disable no-empty-blocks
    }

    // Public functions
    /// @inheritdoc IModule
    function moduleId() public view returns (string memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.name;
    }

    /// @inheritdoc ITownsApp
    function requiredPermissions() external view returns (bytes32[] memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.permissions;
    }

    // Internal functions
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

    function _checkAllowed() internal view {
        if (msg.sender == owner()) return;
        if (msg.sender == SimpleAppStorage.getLayout().client) return;
        Unauthorized.selector.revertWith();
    }
}
