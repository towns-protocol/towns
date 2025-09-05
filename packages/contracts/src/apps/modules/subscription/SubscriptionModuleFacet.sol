// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IValidationModule} from "@erc6900/reference-implementation/interfaces/IValidationModule.sol";
import {IValidationHookModule} from "@erc6900/reference-implementation/interfaces/IValidationHookModule.sol";
import {ISubscriptionModule} from "./ISubscriptionModule.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";

// libraries
import {Subscription, SubscriptionModuleStorage} from "./SubscriptionModuleStorage.sol";
import {PackedUserOperation} from "@eth-infinitism/account-abstraction/interfaces/PackedUserOperation.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {ValidationLocatorLib} from "modular-account/src/libraries/ValidationLocatorLib.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";

// contracts
import {ModuleBase} from "modular-account/src/modules/ModuleBase.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {MembershipFacet} from "../../../spaces/facets/membership/MembershipFacet.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title Subscription Module
/// @notice Module for managing subscriptions to spaces
contract SubscriptionModuleFacet is
    ISubscriptionModule,
    IValidationModule,
    IValidationHookModule,
    ModuleBase,
    OwnableBase,
    ReentrancyGuardTransient,
    Facet
{
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;
    using CustomRevert for bytes4;

    uint256 internal constant _SIG_VALIDATION_FAILED = 1;

    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant RENEWAL_BUFFER = 1 days;
    uint256 public constant GRACE_PERIOD = 3 days;

    function __SubscriptionModule_init() external onlyInitializing {
        _addInterface(type(ISubscriptionModule).interfaceId);
        _addInterface(type(IValidationModule).interfaceId);
        _addInterface(type(IValidationHookModule).interfaceId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           External                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IModule
    function moduleId() external pure returns (string memory) {
        return "towns.subscription-module.1.0.0";
    }

    /// @inheritdoc IModule
    function onInstall(bytes calldata data) external override nonReentrant {
        (uint32 entityId, address space, uint256 tokenId) = abi.decode(
            data,
            (uint32, address, uint256)
        );

        Validator.checkAddress(space);

        if (IERC721(space).ownerOf(tokenId) != msg.sender)
            SubscriptionModule__InvalidTokenOwner.selector.revertWith();

        MembershipFacet membershipFacet = MembershipFacet(space);
        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        Subscription storage sub = $.subscriptions[msg.sender][entityId];
        sub.space = space;
        sub.entityId = entityId;
        sub.tokenId = tokenId;
        sub.active = true;
        sub.renewalPrice = membershipFacet.getMembershipRenewalPrice(tokenId);

        uint256 expiresAt = membershipFacet.expiresAt(tokenId);

        if (expiresAt > RENEWAL_BUFFER) {
            sub.nextRenewalTime = uint64(expiresAt - RENEWAL_BUFFER);
        } else {
            sub.nextRenewalTime = uint64(block.timestamp);
        }

        $.entityIds[msg.sender].add(uint256(entityId));

        emit SubscriptionConfigured(
            msg.sender,
            entityId,
            space,
            tokenId,
            sub.renewalPrice,
            sub.nextRenewalTime
        );
    }

    /// @inheritdoc IModule
    function onUninstall(bytes calldata data) external override nonReentrant {
        uint32 entityId = abi.decode(data, (uint32));

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        if (!$.entityIds[msg.sender].remove(entityId))
            SubscriptionModule__InvalidEntityId.selector.revertWith();
        delete $.subscriptions[msg.sender][entityId];

        emit SubscriptionDeactivated(msg.sender, entityId);
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
        return;
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         Renewals                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISubscriptionModule
    function batchProcessRenewals(RenewalParams[] calldata params) external nonReentrant {
        uint256 length = params.length;
        if (length > MAX_BATCH_SIZE) SubscriptionModule__ExceedsMaxBatchSize.selector.revertWith();
        if (length == 0) SubscriptionModule__EmptyBatch.selector.revertWith();

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        for (uint256 i; i < length; ++i) {
            if (!_isAllowed($, params[i].account, msg.sender))
                SubscriptionModule__InvalidCaller.selector.revertWith();

            Subscription storage sub = $.subscriptions[params[i].account][params[i].entityId];

            // Skip inactive subscriptions
            if (!sub.active) {
                emit BatchRenewalSkipped(params[i].account, params[i].entityId, "INACTIVE");
                continue;
            }

            // Skip if renewal not due
            if (block.timestamp < sub.nextRenewalTime) {
                emit BatchRenewalSkipped(params[i].account, params[i].entityId, "NOT_DUE");
                continue;
            }

            // Skip if past grace period (will be handled by individual call)
            if (block.timestamp > sub.nextRenewalTime + GRACE_PERIOD) {
                emit BatchRenewalSkipped(params[i].account, params[i].entityId, "PAST_GRACE");
                continue;
            }

            _processRenewal($, params[i]);
        }
    }

    /// @inheritdoc ISubscriptionModule
    function processRenewal(RenewalParams calldata renewalParams) external nonReentrant {
        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();
        if (!_isAllowed($, renewalParams.account, msg.sender))
            SubscriptionModule__InvalidCaller.selector.revertWith();
        _processRenewal($, renewalParams);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Subscription                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ISubscriptionModule
    function getSubscription(
        address account,
        uint32 entityId
    ) external view returns (Subscription memory) {
        return SubscriptionModuleStorage.getLayout().subscriptions[account][entityId];
    }

    /// @inheritdoc ISubscriptionModule
    function pauseSubscription(uint32 entityId) external {
        Subscription storage sub = SubscriptionModuleStorage.getLayout().subscriptions[msg.sender][
            entityId
        ];

        if (!sub.active) SubscriptionModule__InactiveSubscription.selector.revertWith();

        sub.active = false;
        emit SubscriptionPaused(msg.sender, entityId);
    }

    /// @inheritdoc ISubscriptionModule
    function getEntityIds(address account) external view returns (uint256[] memory) {
        return SubscriptionModuleStorage.getLayout().entityIds[account].values();
    }

    /// @inheritdoc ISubscriptionModule
    function grantOperator(address operator) external onlyOwner {
        Validator.checkAddress(operator);
        SubscriptionModuleStorage.getLayout().operators.add(operator);
    }

    /// @inheritdoc ISubscriptionModule
    function revokeOperator(address operator) external onlyOwner {
        Validator.checkAddress(operator);
        SubscriptionModuleStorage.getLayout().operators.remove(operator);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Internal                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _processRenewal(
        SubscriptionModuleStorage.Layout storage $,
        RenewalParams calldata params
    ) internal {
        Subscription storage sub = $.subscriptions[params.account][params.entityId];

        // Validate subscription state
        if (!sub.active) SubscriptionModule__InactiveSubscription.selector.revertWith();
        if (block.timestamp < sub.nextRenewalTime)
            SubscriptionModule__RenewalNotDue.selector.revertWith();

        // Check if we're past the grace period
        if (block.timestamp > sub.nextRenewalTime + GRACE_PERIOD) {
            sub.active = false;
            emit SubscriptionPaused(params.account, params.entityId);
            return;
        }

        MembershipFacet membershipFacet = MembershipFacet(sub.space);

        // Get current renewal price from Towns contract
        uint256 actualRenewalPrice = membershipFacet.getMembershipRenewalPrice(sub.tokenId);

        // Store the current nextRenewalTime in case we need to revert
        uint64 previousNextRenewalTime = sub.nextRenewalTime;

        // Update state BEFORE external calls to prevent reentrancy
        // Set to a far future time to prevent re-entry while processing
        // This ensures the "renewal not due" check will fail if re-entered
        sub.nextRenewalTime = uint64(block.timestamp + 365 days);

        // Construct the renewal call to space contract
        bytes memory renewalCall = abi.encodeCall(MembershipFacet.renewMembership, (sub.tokenId));

        // Create the data parameter for executeWithRuntimeValidation
        // This should be an execute() call to the space contract
        bytes memory executeData = abi.encodeCall(
            IModularAccount.execute,
            (
                sub.space, // target
                actualRenewalPrice, // value
                renewalCall // data
            )
        );

        // Use the proper pack function from ValidationLocatorLib
        bytes memory authorization = _runtimeFinal(
            sub.entityId,
            abi.encode(sub.space, sub.tokenId)
        );

        // Call executeWithRuntimeValidation with the correct parameters
        bytes memory runtimeValidationCall = abi.encodeCall(
            IModularAccount.executeWithRuntimeValidation,
            (
                executeData, // The execute() call data
                authorization // Authorization for validation
            )
        );

        // External call happens here
        bytes memory result = LibCall.callContract(params.account, 0, runtimeValidationCall);

        // Check if the call succeeded
        if (result.length == 0) {
            // Revert state on failure
            sub.nextRenewalTime = previousNextRenewalTime;
            SubscriptionModule__RenewalFailed.selector.revertWith();
        }

        // Get the actual new expiration time after successful renewal
        uint256 newExpiresAt = membershipFacet.expiresAt(sub.tokenId);

        // Update subscription state after successful renewal
        sub.nextRenewalTime = uint64(newExpiresAt - RENEWAL_BUFFER);
        sub.lastRenewalTime = uint64(block.timestamp);
        sub.spent += actualRenewalPrice;

        emit SubscriptionRenewed(params.account, sub.entityId, sub.nextRenewalTime);
    }

    function _runtimeFinal(
        uint32 entityId,
        bytes memory finalData
    ) internal pure returns (bytes memory) {
        return
            ValidationLocatorLib.packSignature(
                entityId,
                false, // selector-based
                bytes.concat(hex"ff", finalData)
            );
    }

    function _isAllowed(
        SubscriptionModuleStorage.Layout storage $,
        address account,
        address caller
    ) internal view returns (bool) {
        if (account == caller) return true;
        return $.operators.contains(caller);
    }
}
