// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IValidationModule} from "@erc6900/reference-implementation/interfaces/IValidationModule.sol";
import {IValidationHookModule} from "@erc6900/reference-implementation/interfaces/IValidationHookModule.sol";
import {ISubscriptionModule} from "./ISubscriptionModule.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";

// libraries
import {Subscription, SubscriptionModuleStorage} from "./SubscriptionModuleStorage.sol";
import {PackedUserOperation} from "@eth-infinitism/account-abstraction/interfaces/PackedUserOperation.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {ValidationLocatorLib} from "modular-account/src/libraries/ValidationLocatorLib.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

// contracts
import {ModuleBase} from "modular-account/src/modules/ModuleBase.sol";
import {MembershipFacet} from "../../../spaces/facets/membership/MembershipFacet.sol";

/// @title Subscription Module
/// @notice Module for managing subscriptions to spaces
contract SubscriptionModule is
    ISubscriptionModule,
    IValidationModule,
    IValidationHookModule,
    ModuleBase,
    ReentrancyGuard
{
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;

    uint256 internal constant _SIG_VALIDATION_FAILED = 1;

    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant RENEWAL_BUFFER = 1 days;
    uint256 public constant GRACE_PERIOD = 3 days;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           External                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IModule
    function moduleId() external pure returns (string memory) {
        return "towns.subscription-module.1.0.0";
    }

    /// @inheritdoc IModule
    function onInstall(bytes calldata data) external override {
        (
            uint32 entityId,
            address space,
            uint256 tokenId,
            uint256 renewalPrice,
            uint256 expiresAt
        ) = abi.decode(data, (uint32, address, uint256, uint256, uint256));

        if (space == address(0)) revert SubscriptionModule__InvalidSpace();
        if (renewalPrice == 0) revert SubscriptionModule__InvalidRenewalPrice();

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        Subscription storage sub = $.subscriptions[msg.sender][entityId];
        sub.space = space;
        sub.entityId = entityId;
        sub.tokenId = tokenId;
        sub.renewalPrice = renewalPrice;
        sub.nextRenewalTime = uint64(expiresAt > 0 ? expiresAt - RENEWAL_BUFFER : block.timestamp);
        sub.active = true;

        $.entityIds[msg.sender].add(uint256(entityId));

        emit SubscriptionConfigured(msg.sender, entityId, space, tokenId, renewalPrice);
    }

    /// @inheritdoc IModule
    function onUninstall(bytes calldata data) external override {
        uint32 entityId = abi.decode(data, (uint32));

        SubscriptionModuleStorage.Layout storage $ = SubscriptionModuleStorage.getLayout();

        $.entityIds[msg.sender].remove(entityId);
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
        uint256 value,
        bytes calldata,
        bytes calldata
    ) external override {
        if (sender != address(this)) revert SubscriptionModule__InvalidSender();

        Subscription storage sub = SubscriptionModuleStorage.getLayout().subscriptions[account][
            entityId
        ];

        if (!sub.active) revert SubscriptionModule__InactiveSubscription();

        _checkAndUpdateSpendLimit(sub, value);
    }

    /// @inheritdoc IValidationHookModule
    function preUserOpValidationHook(
        uint32 /* entityId */,
        PackedUserOperation calldata /* userOp */,
        bytes32 /* userOpHash */
    ) external pure returns (uint256) {
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
        revert SubscriptionModule__NotSupported();
    }

    /// @inheritdoc IValidationHookModule
    function preSignatureValidationHook(
        uint32 /* entityId */,
        address /* sender */,
        bytes32 /* hash */,
        bytes calldata /* signature */
    ) external pure {
        revert SubscriptionModule__NotSupported();
    }

    /// @inheritdoc ISubscriptionModule
    function batchProcessRenewals(RenewalParams[] calldata params) external nonReentrant {
        uint256 length = params.length;
        if (length > MAX_BATCH_SIZE) revert SubscriptionModule__InvalidConfiguration();

        for (uint256 i; i < length; ++i) {
            Subscription storage sub = SubscriptionModuleStorage.getLayout().subscriptions[
                params[i].account
            ][params[i].entityId];

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

            _processRenewal(params[i]);
        }
    }

    /// @inheritdoc ISubscriptionModule
    function processRenewal(RenewalParams calldata renewalParams) external nonReentrant {
        _processRenewal(renewalParams);
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

        if (!sub.active) revert SubscriptionModule__InactiveSubscription();

        sub.active = false;
        emit SubscriptionPaused(msg.sender, entityId);
    }

    /// @inheritdoc ISubscriptionModule
    function getEntityIds(address account) external view returns (uint256[] memory) {
        return SubscriptionModuleStorage.getLayout().entityIds[account].values();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            Public                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ModuleBase, IERC165) returns (bool) {
        return (interfaceId == type(IValidationModule).interfaceId ||
            interfaceId == type(IValidationHookModule).interfaceId ||
            super.supportsInterface(interfaceId));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Internal                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _checkAndUpdateSpendLimit(Subscription storage sub, uint256 amount) internal {
        // Cache storage values
        uint64 nextRenewalTime = sub.nextRenewalTime;
        uint256 spent = sub.spent;
        uint256 renewalPrice = sub.renewalPrice;

        if (block.timestamp >= nextRenewalTime + GRACE_PERIOD) {
            sub.spent = 0;
            sub.nextRenewalTime = uint64(block.timestamp);
            spent = 0;
        }

        uint256 newSpent = uint256(spent) + amount;
        if (newSpent > renewalPrice) revert SubscriptionModule__SpendLimitExceeded();
        sub.spent = newSpent;
    }

    function _extractPaymentAmount(
        bytes calldata data,
        uint256 value
    ) internal pure returns (uint256) {
        if (value > 0) return value;

        if (data.length >= 68) {
            bytes4 selector = bytes4(data[0:4]);
            if (selector == bytes4(keccak256("transfer(address,uint256)"))) {
                return abi.decode(data[36:68], (uint256));
            }
        }

        return 0;
    }

    function _processRenewal(RenewalParams calldata params) internal {
        Subscription storage sub = SubscriptionModuleStorage.getLayout().subscriptions[
            params.account
        ][params.entityId];

        // ====== CHECKS ======
        // Validate subscription state
        if (!sub.active) revert SubscriptionModule__InactiveSubscription();
        if (block.timestamp < sub.nextRenewalTime) revert SubscriptionModule__RenewalNotDue();

        // Check if we're past the grace period
        if (block.timestamp > sub.nextRenewalTime + GRACE_PERIOD) {
            sub.active = false;
            emit SubscriptionPaused(params.account, params.entityId);
            return;
        }

        // Get current renewal price from Towns contract
        uint256 actualRenewalPrice = MembershipFacet(sub.space).getMembershipRenewalPrice(
            sub.tokenId
        );

        // Safety check - don't proceed if price increased significantly (>10%)
        if (actualRenewalPrice > (uint256(sub.renewalPrice) * 110) / 100)
            revert SubscriptionModule__InsufficientPayment();

        // ====== EFFECTS ======
        // Store the current nextRenewalTime in case we need to revert
        uint64 previousNextRenewalTime = sub.nextRenewalTime;

        // Update state BEFORE external calls to prevent reentrancy
        // Set to a far future time to prevent re-entry while processing
        // This ensures the "renewal not due" check will fail if re-entered
        sub.nextRenewalTime = uint64(block.timestamp + 365 days);

        // ====== INTERACTIONS ======
        // Construct the renewal call to space contract
        bytes memory renewalCall = abi.encodeWithSelector(
            MembershipFacet.renewMembership.selector,
            sub.tokenId
        );

        // Create the data parameter for executeWithRuntimeValidation
        // This should be an execute() call to the space contract
        bytes memory executeData = abi.encodeWithSelector(
            IModularAccount.execute.selector,
            sub.space, // target
            actualRenewalPrice, // value
            renewalCall // data
        );

        bytes memory extraData = abi.encode(sub.space, sub.tokenId);

        // Use the proper pack function from ValidationLocatorLib
        bytes memory authorization = _runtimeFinal(sub.entityId, extraData);

        // Call executeWithRuntimeValidation with the correct parameters
        bytes memory runtimeValidationCall = abi.encodeWithSelector(
            IModularAccount.executeWithRuntimeValidation.selector,
            executeData, // The execute() call data
            authorization // Authorization for validation
        );

        // External call happens here
        bytes memory result = LibCall.callContract(params.account, 0, runtimeValidationCall);

        // Check if the call succeeded
        if (result.length == 0) {
            // Revert state on failure
            sub.nextRenewalTime = previousNextRenewalTime;
            revert SubscriptionModule__RenewalFailed();
        }

        // Get the actual new expiration time after successful renewal
        uint256 newExpiresAt = MembershipFacet(sub.space).expiresAt(sub.tokenId);

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

    // Build with ordered pre-runtime hook segments (index = array index)
    // Each non-empty hook payload will be encoded as: [uint8 index][uint32 len][bytes body]
    // Then the required final segment [0xff][finalData]
    function _runtimeWithHooks(
        uint32 entityId,
        bytes[] memory orderedHookDatas,
        bytes memory finalData
    ) internal pure returns (bytes memory) {
        bytes memory rem;
        for (uint256 i = 0; i < orderedHookDatas.length; ++i) {
            bytes memory d = orderedHookDatas[i];
            if (d.length == 0) continue;
            rem = abi.encodePacked(rem, uint8(i), uint32(d.length), d);
        }
        rem = bytes.concat(rem, hex"ff", finalData);
        return ValidationLocatorLib.packSignature(entityId, false, rem);
    }
}
