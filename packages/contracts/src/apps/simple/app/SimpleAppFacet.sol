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
import {IERC5267} from "@openzeppelin/contracts/interfaces/IERC5267.sol";
import {IIdentityRegistry, IIdentityRegistryBase} from "../../facets/identity/IIdentityRegistry.sol";

// contracts
import {BaseApp} from "../../../apps/BaseApp.sol";
import {SimpleAccountFacet} from "../account/SimpleAccountFacet.sol";
import {IntrospectionFacet} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionFacet.sol";
import {Receiver} from "solady/accounts/Receiver.sol";
import {ERC1271Facet} from "@towns-protocol/diamond/src/facets/accounts/ERC1271Facet.sol";
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

// libraries
import {SimpleAppStorage} from "../../simple/app/SimpleAppStorage.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {SignatureCheckerLib} from "solady/utils/SignatureCheckerLib.sol";

contract SimpleAppFacet is
    ISimpleApp,
    IIdentityRegistryBase,
    BaseApp,
    SimpleAccountFacet,
    IntrospectionFacet,
    ERC1271Facet,
    EIP712Facet,
    ReentrancyGuardTransient
{
    using CustomRevert for bytes4;

    uint256 internal constant MAX_PERMISSIONS = 10;

    receive() external payable override(BaseApp, Receiver) {
        _onPayment(msg.sender, msg.value);
    }

    function __SimpleAppFacet_init(bytes calldata data) external onlyInitializing {
        __SimpleAppFacet_init_unchained(data);
    }

    /// @inheritdoc ITownsApp
    function initialize(bytes calldata data) external initializer {
        __SimpleAppFacet_init_unchained(data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Simple App Functions                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISimpleApp
    function promoteAgent(
        string calldata agentUri,
        MetadataEntry[] calldata metadata
    ) external onlyOwner nonReentrant returns (uint256 agentId) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        if ($.agentId != 0) SimpleApp__AgentAlreadyPromoted.selector.revertWith();
        address coordinator = _getCoordinator();
        agentId = IIdentityRegistry(coordinator).register(agentUri, metadata);
        $.agentId = agentId;
        emit AgentPromoted(msg.sender, agentId);
    }

    /// @inheritdoc ISimpleApp
    function withdrawETH(address recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) SimpleApp__ZeroAddress.selector.revertWith();

        uint256 balance = address(this).balance;
        if (balance == 0) SimpleApp__NoBalanceToWithdraw.selector.revertWith();

        CurrencyTransfer.safeTransferNativeToken(recipient, balance);

        emit Withdrawal(recipient, balance);
    }

    /// @inheritdoc ISimpleApp
    function updateClient(address newClient) external onlyOwner {
        if (newClient == address(0)) SimpleApp__ZeroAddress.selector.revertWith();
        address oldClient = SimpleAppStorage.getLayout().client;
        SimpleAppStorage.getLayout().client = newClient;
        emit ClientUpdated(oldClient, newClient);
    }

    /// @inheritdoc ISimpleApp
    function updatePricing(uint256 installPrice, uint48 accessDuration) external onlyOwner {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();

        if (accessDuration == 0) SimpleApp__InvalidAmount.selector.revertWith();

        $.installPrice = installPrice;
        $.accessDuration = accessDuration;

        emit PricingUpdated(installPrice, accessDuration);
    }

    /// @inheritdoc ISimpleApp
    function updatePermissions(bytes32[] calldata permissions) external onlyOwner {
        if (permissions.length > MAX_PERMISSIONS) SimpleApp__InvalidAmount.selector.revertWith();
        if (permissions.length == 0) SimpleApp__InvalidAmount.selector.revertWith();
        SimpleAppStorage.getLayout().permissions = permissions;
        emit PermissionsUpdated(permissions);
    }

    /// @inheritdoc ISimpleApp
    function getAgentId() external view returns (uint256) {
        return SimpleAppStorage.getLayout().agentId;
    }

    /// @inheritdoc ITownsApp
    function requiredPermissions() external view returns (bytes32[] memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.permissions;
    }

    /// @inheritdoc IExecutionModule
    function executionManifest() external pure returns (ExecutionManifest memory) {
        // solhint-disable no-empty-blocks
    }

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(BaseApp, IntrospectionFacet) returns (bool) {
        return _supportsInterface(interfaceId);
    }

    /// @inheritdoc IModule
    function moduleId() public view returns (string memory) {
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        return $.name;
    }

    // Internal functions
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

    function _onInstall(bytes calldata) internal view override {
        if (msg.sender != _getCoordinator()) SimpleApp__InvalidCaller.selector.revertWith();
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
}
