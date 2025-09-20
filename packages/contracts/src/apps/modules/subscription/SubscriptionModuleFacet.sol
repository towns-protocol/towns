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
        uint256 expiresAt = membershipFacet.expiresAt(tokenId);

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();
        Subscription storage sub = $.subscriptions[msg.sender][entityId];
        sub.space = space;
        sub.active = true;
        sub.tokenId = tokenId;
        // Calculate renewal time, ensuring it's not in the past
        uint256 idealRenewalTime = expiresAt > RENEWAL_BUFFER ? expiresAt - RENEWAL_BUFFER : 0;
        sub.nextRenewalTime = uint40(idealRenewalTime > block.timestamp ? idealRenewalTime : block.timestamp);

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
        uint256 length = params.length;
        if (length > MAX_BATCH_SIZE) SubscriptionModule__ExceedsMaxBatchSize.selector.revertWith();
        if (length == 0) SubscriptionModule__EmptyBatch.selector.revertWith();

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        for (uint256 i; i < length; ++i) {
            if (!_isAllowed($.operators, params[i].account))
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

            _processRenewal(sub, params[i]);
        }
    }

    /// @inheritdoc ISubscriptionModule
    function processRenewal(RenewalParams calldata renewalParams) external nonReentrant {
        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();
        if (!_isAllowed($.operators, renewalParams.account))
            SubscriptionModule__InvalidCaller.selector.revertWith();
        _processRenewal(
            $.subscriptions[renewalParams.account][renewalParams.entityId],
            renewalParams
        );
    }

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
    function _processRenewal(Subscription storage sub, RenewalParams calldata params) internal {
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

        // Check if the account has enough balance
        if (params.account.balance < actualRenewalPrice)
            SubscriptionModule__InsufficientBalance.selector.revertWith();

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
            params.entityId,
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
        LibCall.callContract(params.account, 0, runtimeValidationCall);

        // Get the actual new expiration time after successful renewal
        uint256 newExpiresAt = membershipFacet.expiresAt(sub.tokenId);

        // Update subscription state after successful renewal
        // Calculate renewal time, ensuring it's not in the past
        uint256 newRenewalTime = newExpiresAt > RENEWAL_BUFFER ? newExpiresAt - RENEWAL_BUFFER : 0;
        sub.nextRenewalTime = uint40(newRenewalTime > block.timestamp ? newRenewalTime : block.timestamp);
        sub.lastRenewalTime = uint40(block.timestamp);
        sub.spent += actualRenewalPrice;

        emit SubscriptionRenewed(params.account, params.entityId, sub.nextRenewalTime);
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

    /// @dev Checks if the caller is allowed to call the function
    /// @param operators The set of operators
    /// @param account The account to check
    /// @return True if the caller is allowed to call the function
    function _isAllowed(
        EnumerableSetLib.AddressSet storage operators,
        address account
    ) internal view returns (bool) {
        if (account == msg.sender) return true;
        return operators.contains(msg.sender);
    }
}
