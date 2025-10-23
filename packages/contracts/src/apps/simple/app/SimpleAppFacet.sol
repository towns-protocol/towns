// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ISimpleApp} from "../../simple/app/ISimpleApp.sol";
import {ITownsApp} from "../../../apps/ITownsApp.sol";
import {ExecutionManifest, IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {IERC5267} from "@openzeppelin/contracts/interfaces/IERC5267.sol";

// contracts
import {BaseApp} from "../../../apps/BaseApp.sol";
import {SimpleAccountFacet} from "../account/SimpleAccountFacet.sol";
import {IntrospectionFacet} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionFacet.sol";
import {Receiver} from "solady/accounts/Receiver.sol";
import {ERC1271Facet} from "@towns-protocol/diamond/src/facets/accounts/ERC1271Facet.sol";
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";

// libraries
import {SimpleAppStorage} from "../../simple/app/SimpleAppStorage.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {SignatureCheckerLib} from "solady/utils/SignatureCheckerLib.sol";

contract SimpleAppFacet is
    ISimpleApp,
    BaseApp,
    SimpleAccountFacet,
    IntrospectionFacet,
    ERC1271Facet,
    EIP712Facet
{
    using CustomRevert for bytes4;

    receive() external payable override(BaseApp, Receiver) {
        _onPayment(msg.sender, msg.value);
    }

    function __SimpleAppFacet_init(bytes calldata data) external onlyInitializing {
        __SimpleAppFacet_init_unchained(data);
    }

    function __SimpleAppFacet_init_unchained(bytes calldata data) internal {
        _addInterface(type(ISimpleApp).interfaceId);
        _addInterface(type(ITownsApp).interfaceId);
        _addInterface(type(IModule).interfaceId);
        _addInterface(type(IExecutionModule).interfaceId);
        _addInterface(type(IERC721Receiver).interfaceId);
        _addInterface(type(IERC1155Receiver).interfaceId);
        _addInterface(type(IERC5267).interfaceId);
        _initializeState(data);
    }

    /// @inheritdoc ITownsApp
    function initialize(bytes calldata data) external initializer {
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
    /// @dev Custom implementation supporting both owner and client
    function _erc1271IsValidSignatureNowCalldata(
        bytes32 hash,
        bytes calldata signature
    ) internal view virtual override returns (bool) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();

        // Try owner first
        if (SignatureCheckerLib.isValidSignatureNowCalldata(_owner(), hash, signature)) {
            return true;
        }

        // Try client if set
        if ($.client != address(0)) {
            return SignatureCheckerLib.isValidSignatureNowCalldata($.client, hash, signature);
        }

        return false;
    }

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
        __IntrospectionBase_init();
        __SimpleAccountFacet_init_unchained(entryPoint, coordinator);
        __EIP712_init_unchained(appId, "1");
        __ERC1271_init_unchained(owner);
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        $.name = appId;
        $.permissions = permissions;
        $.installPrice = installPrice;
        $.accessDuration = accessDuration;
        $.client = client;
        emit SimpleAppInitialized(owner, client);
    }
}
