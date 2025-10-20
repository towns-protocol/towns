// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ISimpleApp} from "../../simple/app/ISimpleApp.sol";
import {ITownsApp} from "../../../apps/ITownsApp.sol";
import {ExecutionManifest, IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IEntryPoint} from "@eth-infinitism/account-abstraction/interfaces/IEntryPoint.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// contracts
import {BaseApp} from "../../../apps/BaseApp.sol";
import {SimpleAccountFacet} from "../account/SimpleAccountFacet.sol";
import {TokenCallbackHandlerFacet} from "../utils/TokenCallbackHandlerFacet.sol";
import {IntrospectionFacet} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionFacet.sol";

// libraries
import {SimpleAppStorage} from "../../simple/app/SimpleAppStorage.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";

contract SimpleAppFacet is
    ISimpleApp,
    BaseApp,
    SimpleAccountFacet,
    TokenCallbackHandlerFacet,
    IntrospectionFacet
{
    using CustomRevert for bytes4;

    function __SimpleAppFacet_init(bytes calldata data) external onlyInitializing {
        __SimpleAppFacet_init_unchained(data);
    }

    function __SimpleAppFacet_init_unchained(bytes calldata data) internal {
        _addInterface(type(ISimpleApp).interfaceId);
        _addInterface(type(ITownsApp).interfaceId);
        _addInterface(type(IModule).interfaceId);
        _addInterface(type(IExecutionModule).interfaceId);
        _initializeState(data);
    }

    /// @inheritdoc ITownsApp
    function initialize(bytes calldata data) external initializer {
        __IntrospectionBase_init();
        __TokenCallbackHandlerFacet_init_unchained();
        __SimpleAppFacet_init_unchained(data);
    }

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(BaseApp, IntrospectionFacet) returns (bool) {
        return _supportsInterface(interfaceId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Simple App Functions                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISimpleApp
    function withdrawETH(address recipient) external onlyOwner {
        if (recipient == address(0)) SimpleApp__ZeroAddress.selector.revertWith();

        uint256 balance = address(this).balance;
        if (balance == 0) SimpleApp__NoBalanceToWithdraw.selector.revertWith();

        CurrencyTransfer.safeTransferNativeToken(recipient, balance);

        emit Withdrawal(recipient, balance);
    }

    /// @inheritdoc ISimpleApp
    function sendCurrency(address recipient, address currency, uint256 amount) external {
        if (!_isAllowedToCall()) SimpleApp__InvalidCaller.selector.revertWith();

        if (recipient == address(0)) SimpleApp__ZeroAddress.selector.revertWith();
        if (currency == address(0)) currency = CurrencyTransfer.NATIVE_TOKEN;
        if (currency.code.length == 0 && currency != CurrencyTransfer.NATIVE_TOKEN)
            SimpleApp__InvalidCurrency.selector.revertWith();
        if (amount == 0) SimpleApp__InvalidAmount.selector.revertWith();

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
        return _owner();
    }

    function _isAllowedToCall() internal view returns (bool) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        if (msg.sender == _owner() || msg.sender == $.client) return true;
        return false;
    }

    function _initializeState(bytes calldata data) internal {
        (
            address owner,
            string memory appId,
            bytes32[] memory permissions,
            uint256 installPrice,
            uint48 accessDuration,
            address client,
            address entryPoint,
            address coordinator
        ) = abi.decode(
                data,
                (address, string, bytes32[], uint256, uint48, address, address, address)
            );
        _transferOwnership(owner);
        __SimpleAccountFacet_init_unchained(entryPoint, coordinator);
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        $.name = appId;
        $.permissions = permissions;
        $.installPrice = installPrice;
        $.accessDuration = accessDuration;
        $.client = client;
        emit SimpleAppInitialized(owner, client);
    }
}
