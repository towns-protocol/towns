// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {IValidationHookModule} from "@erc6900/reference-implementation/interfaces/IValidationHookModule.sol";
import {IValidationModule} from "@erc6900/reference-implementation/interfaces/IValidationModule.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ISubscriptionModule} from "./ISubscriptionModule.sol";

// libraries
import {PackedUserOperation} from "@eth-infinitism/account-abstraction/interfaces/PackedUserOperation.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {ValidationLocatorLib} from "modular-account/src/libraries/ValidationLocatorLib.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";
import {Subscription, SubscriptionModuleStorage} from "./SubscriptionModuleStorage.sol";

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
    uint256 public constant GRACE_PERIOD = 3 days;

    // Dynamic buffer times based on expiration proximity
    uint256 public constant BUFFER_IMMEDIATE = 2 minutes; // For expirations within 1 hour
    uint256 public constant BUFFER_SHORT = 1 hours; // For expirations within 6 hours
    uint256 public constant BUFFER_MEDIUM = 6 hours; // For expirations within 24 hours
    uint256 public constant BUFFER_LONG = 12 hours; // For expirations more than 24 hours away

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
        uint256 expiresAt = membershipFacet.expiresAt(tokenId);

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();
        Subscription storage sub = $.subscriptions[msg.sender][entityId];
        sub.space = space;
        sub.active = true;
        sub.tokenId = tokenId;
        sub.nextRenewalTime = uint40(expiresAt - _getRenewalBuffer(expiresAt));

        $.entityIds[msg.sender].add(entityId);

        emit SubscriptionConfigured(msg.sender, entityId, space, tokenId, sub.nextRenewalTime);
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
                sub.active = false;
                emit SubscriptionPaused(params[i].account, params[i].entityId);
                emit BatchRenewalSkipped(params[i].account, params[i].entityId, "PAST_GRACE");
                continue;
            }

            // Skip if account isn't owner anymore
            if (IERC721(sub.space).ownerOf(sub.tokenId) != params[i].account) {
                emit BatchRenewalSkipped(params[i].account, params[i].entityId, "NOT_OWNER");
                continue;
            }

            MembershipFacet membershipFacet = MembershipFacet(sub.space);
            uint256 actualRenewalPrice = membershipFacet.getMembershipRenewalPrice(sub.tokenId);

            if (params[i].account.balance < actualRenewalPrice) {
                emit BatchRenewalSkipped(
                    params[i].account,
                    params[i].entityId,
                    "INSUFFICIENT_BALANCE"
                );
                continue;
            }

            _processRenewal(sub, params[i], membershipFacet, actualRenewalPrice);
        }
    }

    /// @inheritdoc ISubscriptionModule
    function getSubscription(
        address account,
        uint32 entityId
    ) external view returns (Subscription memory) {
        return SubscriptionModuleStorage.getLayout().subscriptions[account][entityId];
    }

    /// @inheritdoc ISubscriptionModule
    function getRenewalBuffer(uint256 expirationTime) external view returns (uint256) {
        return _getRenewalBuffer(expirationTime);
    }

    /// @inheritdoc ISubscriptionModule
    function activateSubscription(uint32 entityId) external {
        Subscription storage sub = SubscriptionModuleStorage.getLayout().subscriptions[msg.sender][
            entityId
        ];

        if (sub.active) SubscriptionModule__ActiveSubscription.selector.revertWith();

        address owner = IERC721(sub.space).ownerOf(sub.tokenId);
        if (msg.sender != owner) SubscriptionModule__InvalidCaller.selector.revertWith();

        sub.active = true;
        emit SubscriptionActivated(msg.sender, entityId);
    }

    /// @inheritdoc ISubscriptionModule
    function pauseSubscription(uint32 entityId) external {
        Subscription storage sub = SubscriptionModuleStorage.getLayout().subscriptions[msg.sender][
            entityId
        ];

        if (!sub.active) SubscriptionModule__InactiveSubscription.selector.revertWith();

        address owner = IERC721(sub.space).ownerOf(sub.tokenId);
        if (msg.sender != owner) SubscriptionModule__InvalidCaller.selector.revertWith();

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
        emit OperatorGranted(operator);
    }

    /// @inheritdoc ISubscriptionModule
    function isOperator(address operator) external view returns (bool) {
        return SubscriptionModuleStorage.getLayout().operators.contains(operator);
    }

    /// @inheritdoc ISubscriptionModule
    function revokeOperator(address operator) external onlyOwner {
        Validator.checkAddress(operator);
        SubscriptionModuleStorage.getLayout().operators.remove(operator);
        emit OperatorRevoked(operator);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Internal                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Processes a single subscription renewal
    /// @param sub The subscription to renew
    /// @param params The parameters for the renewal
    function _processRenewal(
        Subscription storage sub,
        RenewalParams calldata params,
        MembershipFacet membershipFacet,
        uint256 actualRenewalPrice
    ) internal {
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
        bytes memory authorization = ValidationLocatorLib.packSignature(
            params.entityId,
            false, // selector-based
            bytes.concat(hex"ff", abi.encode(sub.space, sub.tokenId))
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
        LibCall.callContract(params.account, 0, runtimeValidationCall);

        // Get the actual new expiration time after successful renewal
        uint256 newExpiresAt = membershipFacet.expiresAt(sub.tokenId);

        // Update subscription state after successful renewal
        sub.nextRenewalTime = uint40(newExpiresAt - _getRenewalBuffer(newExpiresAt));
        sub.lastRenewalTime = uint40(block.timestamp);
        sub.spent += actualRenewalPrice;

        emit SubscriptionRenewed(params.account, params.entityId, sub.nextRenewalTime);
    }

    /// @dev Determines the appropriate renewal buffer time based on expiration proximity
    /// @param expirationTime The expiration timestamp of the membership
    /// @return The appropriate buffer time in seconds before expiration
    function _getRenewalBuffer(uint256 expirationTime) internal view returns (uint256) {
        uint256 timeUntilExpiration = expirationTime - block.timestamp;

        // If expiration is within 1 hour, use immediate buffer (2 minutes before expiration)
        if (timeUntilExpiration <= 1 hours) {
            return BUFFER_IMMEDIATE;
        }

        // If expiration is within 6 hours, use short buffer (1 hour before expiration)
        if (timeUntilExpiration <= 6 hours) {
            return BUFFER_SHORT;
        }

        // If expiration is within 24 hours, use medium buffer (6 hours before expiration)
        if (timeUntilExpiration <= 24 hours) {
            return BUFFER_MEDIUM;
        }

        // For expirations more than 24 hours away, use long buffer (12 hours before expiration)
        return BUFFER_LONG;
    }

    /// @dev Creates the runtime final data for the renewal
    /// @param entityId The entity ID of the subscription
    /// @param finalData The final data for the renewal
    /// @return The runtime final data
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
}
