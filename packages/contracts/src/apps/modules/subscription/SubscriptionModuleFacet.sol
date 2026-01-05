// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IValidationHookModule} from "@erc6900/reference-implementation/interfaces/IValidationHookModule.sol";
import {IValidationModule} from "@erc6900/reference-implementation/interfaces/IValidationModule.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IMembership} from "../../../spaces/facets/membership/IMembership.sol";
import {IBanning} from "../../../spaces/facets/banning/IBanning.sol";
import {ISubscriptionModule} from "./ISubscriptionModule.sol";

// libraries
import {PackedUserOperation} from "@eth-infinitism/account-abstraction/interfaces/PackedUserOperation.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";
import {IArchitect} from "../../../factory/facets/architect/IArchitect.sol";
import {Subscription, SubscriptionModuleStorage} from "./SubscriptionModuleStorage.sol";

// contracts
import {ModuleBase} from "modular-account/src/modules/ModuleBase.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {SubscriptionModuleBase} from "./SubscriptionModuleBase.sol";

/// @title Subscription Module
/// @notice Module for managing subscriptions to spaces
contract SubscriptionModuleFacet is
    ISubscriptionModule,
    IValidationModule,
    IValidationHookModule,
    ModuleBase,
    OwnableBase,
    ReentrancyGuardTransient,
    SubscriptionModuleBase,
    Facet
{
    using EnumerableSetLib for EnumerableSetLib.AddressSet;
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;
    using CustomRevert for bytes4;
    using SafeCastLib for uint256;

    uint256 internal constant _SIG_VALIDATION_FAILED = 1;

    uint256 public constant MAX_BATCH_SIZE = 50;

    function __SubscriptionModule_init() external onlyInitializing {
        _addInterface(type(ISubscriptionModule).interfaceId);
        _addInterface(type(IValidationModule).interfaceId);
        _addInterface(type(IValidationHookModule).interfaceId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISubscriptionModule
    function setSpaceFactory(address spaceFactory) external onlyOwner {
        Validator.checkAddress(spaceFactory);
        SubscriptionModuleStorage.getLayout().spaceFactory = spaceFactory;
        emit SpaceFactoryChanged(spaceFactory);
    }

    /// @inheritdoc ISubscriptionModule
    function grantOperator(address operator) external onlyOwner {
        Validator.checkAddress(operator);
        SubscriptionModuleStorage.getLayout().operators.add(operator);
        emit OperatorGranted(operator);
    }

    /// @inheritdoc ISubscriptionModule
    function revokeOperator(address operator) external onlyOwner {
        Validator.checkAddress(operator);
        SubscriptionModuleStorage.getLayout().operators.remove(operator);
        emit OperatorRevoked(operator);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MODULE LIFECYCLE                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IModule
    function onInstall(bytes calldata data) external override nonReentrant {
        (uint32 entityId, address space, uint256 tokenId) = abi.decode(
            data,
            (uint32, address, uint256)
        );

        Validator.checkAddress(space);

        if (entityId == 0) SubscriptionModule__InvalidEntityId.selector.revertWith();

        if (IBanning(space).isBanned(tokenId))
            SubscriptionModule__MembershipBanned.selector.revertWith();

        if (IERC721(space).ownerOf(tokenId) != msg.sender)
            SubscriptionModule__InvalidTokenOwner.selector.revertWith();

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        if (IArchitect($.spaceFactory).getTokenIdBySpace(space) == 0)
            SubscriptionModule__InvalidSpace.selector.revertWith();

        if (!$.entityIds[msg.sender].add(entityId))
            SubscriptionModule__InvalidEntityId.selector.revertWith();

        if ($.tokenIdByAccountBySpace[msg.sender][space] != 0)
            SubscriptionModule__SubscriptionAlreadyInstalled.selector.revertWith();

        $.tokenIdByAccountBySpace[msg.sender][space] = tokenId;

        IMembership membershipFacet = IMembership(space);

        uint256 expiresAt = membershipFacet.expiresAt(tokenId);

        // Prevent installation with expired membership
        if (expiresAt <= block.timestamp)
            SubscriptionModule__MembershipExpired.selector.revertWith();

        uint64 duration = membershipFacet.getMembershipDuration();

        Subscription storage sub = $.subscriptions[msg.sender][entityId];
        sub.space = space;
        sub.tokenId = tokenId;
        sub.installTime = block.timestamp.toUint40();
        _syncSubscriptionState(sub, membershipFacet, expiresAt, duration);

        emit SubscriptionConfigured(
            msg.sender,
            entityId,
            space,
            tokenId,
            sub.nextRenewalTime,
            expiresAt
        );
    }

    /// @inheritdoc IModule
    function onUninstall(bytes calldata data) external override nonReentrant {
        uint32 entityId = abi.decode(data, (uint32));

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        if (!$.entityIds[msg.sender].remove(entityId))
            SubscriptionModule__InvalidEntityId.selector.revertWith();

        Subscription storage sub = $.subscriptions[msg.sender][entityId];

        delete $.tokenIdByAccountBySpace[msg.sender][sub.space];
        delete $.subscriptions[msg.sender][entityId];

        emit SubscriptionDeactivated(msg.sender, entityId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  STATE-CHANGING FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISubscriptionModule
    function batchProcessRenewals(RenewalParams[] calldata params) external nonReentrant {
        uint256 paramsLen = params.length;
        if (paramsLen > MAX_BATCH_SIZE)
            SubscriptionModule__ExceedsMaxBatchSize.selector.revertWith();
        if (paramsLen == 0) SubscriptionModule__EmptyBatch.selector.revertWith();

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        if (!$.operators.contains(msg.sender))
            SubscriptionModule__InvalidCaller.selector.revertWith();

        for (uint256 i; i < paramsLen; ++i) {
            Subscription storage sub = $.subscriptions[params[i].account][params[i].entityId];

            IMembership membershipFacet = IMembership(sub.space);
            uint256 actualRenewalPrice = membershipFacet.getMembershipRenewalPrice(sub.tokenId);
            uint256 actualDuration = membershipFacet.getMembershipDuration();

            // Validate renewal eligibility
            (bool shouldSkip, bool shouldPause, SkipReason reason) = _validateRenewalEligibility(
                sub,
                params[i].account,
                actualRenewalPrice,
                actualDuration
            );

            if (shouldSkip) {
                // Handle special case for "NOT_DUE" - different event
                if (reason == SkipReason.NOT_DUE) {
                    emit SubscriptionNotDue(params[i].account, params[i].entityId);
                } else {
                    // Pause subscription if needed
                    if (shouldPause) {
                        _pauseSubscription(sub, params[i].account, params[i].entityId);
                    }
                    emit BatchRenewalSkipped(
                        params[i].account,
                        params[i].entityId,
                        _skipReasonToString(reason)
                    );
                }
                continue;
            }

            // Check for manual renewal (expiresAt changed)
            uint256 actualExpiresAt = membershipFacet.expiresAt(sub.tokenId);
            if (sub.lastKnownExpiresAt != actualExpiresAt) {
                sub.nextRenewalTime = _calculateBaseRenewalTime(actualExpiresAt, sub.duration);
                sub.lastKnownExpiresAt = actualExpiresAt;
                emit SubscriptionSynced(params[i].account, params[i].entityId, sub.nextRenewalTime);
                continue;
            }

            _processRenewal(sub, params[i], membershipFacet, actualRenewalPrice);
        }
    }

    /// @inheritdoc ISubscriptionModule
    function activateSubscription(uint32 entityId) external nonReentrant {
        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        if (!_hasEntityId($, msg.sender, entityId))
            SubscriptionModule__InvalidEntityId.selector.revertWith();

        Subscription storage sub = $.subscriptions[msg.sender][entityId];

        if (sub.active) SubscriptionModule__ActiveSubscription.selector.revertWith();

        _requireOwnership(sub);

        IMembership membershipFacet = IMembership(sub.space);
        uint256 expiresAt = membershipFacet.expiresAt(sub.tokenId);
        uint64 duration = membershipFacet.getMembershipDuration();

        _syncSubscriptionState(sub, membershipFacet, expiresAt, duration);

        emit SubscriptionActivated(msg.sender, entityId);
    }

    /// @inheritdoc ISubscriptionModule
    function pauseSubscription(uint32 entityId) external nonReentrant {
        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();
        Subscription storage sub = $.subscriptions[msg.sender][entityId];

        if (!sub.active) SubscriptionModule__InactiveSubscription.selector.revertWith();

        _requireOwnership(sub);

        _pauseSubscription(sub, msg.sender, entityId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISubscriptionModule
    function getSpaceFactory() external view returns (address) {
        return SubscriptionModuleStorage.getLayout().spaceFactory;
    }

    /// @inheritdoc ISubscriptionModule
    function getSubscription(
        address account,
        uint32 entityId
    ) external view returns (Subscription memory) {
        return SubscriptionModuleStorage.getLayout().subscriptions[account][entityId];
    }

    /// @inheritdoc ISubscriptionModule
    function getEntityIds(address account) external view returns (uint256[] memory) {
        return SubscriptionModuleStorage.getLayout().entityIds[account].values();
    }

    /// @inheritdoc ISubscriptionModule
    function isOperator(address operator) external view returns (bool) {
        return SubscriptionModuleStorage.getLayout().operators.contains(operator);
    }

    /// @inheritdoc IValidationModule
    function validateRuntime(
        address account,
        uint32 entityId,
        address sender,
        uint256,
        bytes calldata,
        bytes calldata
    ) external view override {
        if (sender != address(this)) SubscriptionModule__InvalidSender.selector.revertWith();
        bool active = SubscriptionModuleStorage.getLayout().subscriptions[account][entityId].active;
        if (!active) SubscriptionModule__InactiveSubscription.selector.revertWith();
    }

    /// @inheritdoc IModule
    function moduleId() external pure returns (string memory) {
        return "towns.subscription-module.1.0.0";
    }

    /// @inheritdoc ISubscriptionModule
    function getRenewalBuffer(uint256 duration) external pure returns (uint256) {
        return _getRenewalBuffer(duration);
    }

    /// @inheritdoc IValidationModule
    function validateUserOp(
        uint32,
        PackedUserOperation calldata,
        bytes32
    ) external pure override returns (uint256) {
        return _SIG_VALIDATION_FAILED;
    }

    /// @inheritdoc IValidationModule
    function validateSignature(
        address,
        uint32,
        address,
        bytes32,
        bytes calldata
    ) external pure override returns (bytes4) {
        return 0xffffffff;
    }

    /// @inheritdoc IValidationHookModule
    function preUserOpValidationHook(
        uint32 /* entityId */,
        PackedUserOperation calldata /* userOp */,
        bytes32 /* userOpHash */
    ) external pure override returns (uint256) {
        return _SIG_VALIDATION_FAILED;
    }

    /// @inheritdoc IValidationHookModule
    function preRuntimeValidationHook(
        uint32 /* entityId */,
        address /* sender */,
        uint256 /* value */,
        bytes calldata /* data */,
        bytes calldata /* authorization */
    ) external pure override {
        SubscriptionModule__NotSupported.selector.revertWith();
    }

    /// @inheritdoc IValidationHookModule
    function preSignatureValidationHook(
        uint32 /* entityId */,
        address /* sender */,
        bytes32 /* hash */,
        bytes calldata /* signature */
    ) external pure override {
        SubscriptionModule__NotSupported.selector.revertWith();
    }
}
