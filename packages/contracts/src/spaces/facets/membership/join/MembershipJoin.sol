// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsPointsBase} from "../../../../airdrop/points/ITownsPoints.sol";
import {IPartnerRegistry, IPartnerRegistryBase} from "../../../../factory/facets/partner/IPartnerRegistry.sol";
import {IEntitlement} from "../../../entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "../../../entitlements/rule/IRuleEntitlement.sol";
import {IRolesBase} from "../../roles/IRoles.sol";
import {IMembership} from "../IMembership.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {BasisPoints} from "../../../../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {MembershipStorage} from "../MembershipStorage.sol";
import {Permissions} from "../../Permissions.sol";
import {ProtocolFeeLib} from "../../ProtocolFeeLib.sol";

// contracts
import {ERC5643Base} from "../../../../diamond/facets/token/ERC5643/ERC5643Base.sol";
import {ERC721ABase} from "../../../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {DispatcherBase} from "../../dispatcher/DispatcherBase.sol";
import {Entitled} from "../../Entitled.sol";
import {EntitlementGatedBase} from "../../gated/EntitlementGatedBase.sol";
import {PointsBase} from "../../points/PointsBase.sol";
import {ReferralsBase} from "../../referrals/ReferralsBase.sol";
import {RolesBase} from "../../roles/RolesBase.sol";
import {MembershipBase} from "../MembershipBase.sol";

/// @title MembershipJoin
/// @notice Handles the logic for joining a space, including entitlement checks and payment
/// processing
/// @dev Join Flow:
/// 1. Payment captured upfront via `_validateAndCapturePayment` (ETH held, ERC20 transferred in)
/// 2. Entitlement check determines sync vs async path:
///    - Sync (local entitlements): immediate token issuance or rejection
///    - Async (crosschain entitlements): payment held in dispatcher, resolved via callback
/// 3. On success: fees distributed from contract via `_pay*` functions, token issued
/// 4. On failure: full refund via `_refundBalance`
///
/// Payment Handling:
/// - ETH: received via payable, excess refunded after fees
/// - ERC20: exact amount transferred in, no refund needed
/// - All fee payments use `address(this)` as source since funds are already in contract
abstract contract MembershipJoin is
    IRolesBase,
    IPartnerRegistryBase,
    ERC5643Base,
    MembershipBase,
    ReferralsBase,
    DispatcherBase,
    RolesBase,
    EntitlementGatedBase,
    Entitled,
    PointsBase,
    ERC721ABase
{
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    struct PricingDetails {
        uint256 basePrice;
        uint256 protocolFee;
        uint256 amountDue;
        bool shouldCharge;
    }

    /// @notice Constant representing the permission to join a space
    bytes32 internal constant JOIN_SPACE = bytes32(abi.encodePacked(Permissions.JoinSpace));

    /// @notice Constant representing the joinSpace(address) function selector
    bytes4 internal constant JOIN_SPACE_SELECTOR = bytes4(keccak256("joinSpace(address)"));

    /// @notice Encodes data for joining a space
    /// @param selector The type of transaction (join with or without referral)
    /// @param sender The address of the sender
    /// @param receiver The address of the receiver
    /// @param referralData Additional data for referrals
    /// @return Encoded join space data
    function _encodeJoinSpaceData(
        bytes4 selector,
        address sender,
        address receiver,
        bytes memory referralData
    ) internal pure returns (bytes memory) {
        return abi.encode(selector, sender, receiver, referralData);
    }

    /// @notice Calculates all pricing details for joining a space
    /// @return joinDetails Struct containing all pricing information
    function _getPricingDetails() internal view returns (PricingDetails memory joinDetails) {
        uint256 totalSupply = _totalSupply();
        uint256 membershipPrice = _getMembershipPrice(totalSupply);
        uint256 freeAllocation = _getMembershipFreeAllocation();

        if (membershipPrice == 0) return joinDetails;

        joinDetails.basePrice = membershipPrice;
        if (freeAllocation > totalSupply) {
            return joinDetails;
        }

        (uint256 totalRequired, uint256 protocolFee) = _getTotalMembershipPayment(membershipPrice);
        (joinDetails.protocolFee, joinDetails.amountDue, joinDetails.shouldCharge) = (
            protocolFee,
            totalRequired,
            true
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            JOIN                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Handles the process of joining a space
    /// @param receiver The address that will receive the membership token
    function _joinSpace(address receiver) internal {
        _validateJoinSpace(receiver);

        PricingDetails memory joinDetails = _getPricingDetails();

        // Validate and capture payment (handles both free and paid memberships)
        address currency = _getMembershipCurrency();
        uint256 capturedAmount = _validateAndCapturePayment(currency, joinDetails.amountDue);

        bytes32 transactionId = _registerTransaction(
            receiver,
            _encodeJoinSpaceData(JOIN_SPACE_SELECTOR, msg.sender, receiver, ""),
            capturedAmount
        );

        (bool isEntitled, bool isCrosschainPending) = _checkEntitlement(
            receiver,
            msg.sender,
            transactionId,
            joinDetails.amountDue
        );

        if (!isCrosschainPending) {
            if (isEntitled) {
                if (!joinDetails.shouldCharge) {
                    _afterChargeForJoinSpace(transactionId, receiver, 0);
                } else {
                    _chargeForJoinSpace(transactionId, joinDetails);
                }
                _refundBalance(transactionId, receiver);
                _issueToken(receiver);
            } else {
                _rejectMembership(transactionId, receiver);
            }
        }
    }

    /// @notice Handles the process of joining a space with a referral
    /// @param receiver The address that will receive the membership token
    /// @param referral The referral information
    function _joinSpaceWithReferral(address receiver, ReferralTypes calldata referral) internal {
        _validateJoinSpace(receiver);

        PricingDetails memory joinDetails = _getPricingDetails();

        // Validate and capture payment (handles both free and paid memberships)
        address currency = _getMembershipCurrency();
        uint256 capturedAmount = _validateAndCapturePayment(currency, joinDetails.amountDue);

        _validateUserReferral(receiver, referral);

        bytes memory referralData = abi.encode(referral);

        bytes4 selector = IMembership.joinSpaceWithReferral.selector;

        bytes32 transactionId = _registerTransaction(
            receiver,
            _encodeJoinSpaceData(selector, msg.sender, receiver, referralData),
            capturedAmount
        );

        (bool isEntitled, bool isCrosschainPending) = _checkEntitlement(
            receiver,
            msg.sender,
            transactionId,
            joinDetails.amountDue
        );

        if (!isCrosschainPending) {
            if (isEntitled) {
                if (!joinDetails.shouldCharge) {
                    _afterChargeForJoinSpace(transactionId, receiver, 0);
                } else {
                    _chargeForJoinSpaceWithReferral(transactionId, joinDetails);
                }
                _refundBalance(transactionId, receiver);
                _issueToken(receiver);
            } else {
                _rejectMembership(transactionId, receiver);
            }
        }
    }

    function _rejectMembership(bytes32 transactionId, address receiver) internal {
        _deleteCapturedData(transactionId);
        _refundBalance(transactionId, receiver);
        emit MembershipTokenRejected(receiver);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         VALIDATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Validates and captures payment based on currency type
    /// @dev For ETH: validates msg.value >= required amount, returns msg.value for refund handling
    /// @dev For ERC20: rejects any ETH sent, transfers tokens from sender to this contract
    /// @dev Handles free memberships (amountRequired = 0) correctly for both currency types
    /// @param currency The currency address (NATIVE_TOKEN for ETH, or ERC20 address)
    /// @param amountRequired The required payment amount (0 for free memberships)
    /// @return The amount to capture (msg.value for ETH, amountRequired for ERC20)
    function _validateAndCapturePayment(
        address currency,
        uint256 amountRequired
    ) internal returns (uint256) {
        if (currency == CurrencyTransfer.NATIVE_TOKEN) {
            // ETH payment: validate msg.value, return full amount for refund handling
            if (msg.value < amountRequired) Membership__InsufficientPayment.selector.revertWith();
            return msg.value;
        }

        // ERC20 payment: reject any ETH sent
        if (msg.value != 0) revert Membership__UnexpectedValue();

        // Transfer ERC20 tokens from sender to contract (skip for free memberships)
        if (amountRequired != 0) _transferIn(currency, msg.sender, amountRequired);

        return amountRequired;
    }

    function _validateUserReferral(
        address receiver,
        ReferralTypes calldata referral
    ) internal view {
        if (referral.userReferral == receiver || referral.userReferral == msg.sender) {
            Membership__InvalidAddress.selector.revertWith();
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ENTITLEMENT                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Checks if a user is entitled to join the space and handles the entitlement process
    /// @dev This function checks both local and crosschain entitlements
    /// @param receiver The address of the user trying to join the space
    /// @param transactionId The unique identifier for this join transaction
    /// @return isEntitled A boolean indicating whether the user is entitled to join
    /// @return isCrosschainPending A boolean indicating if a crosschain entitlement check is
    /// pending
    function _checkEntitlement(
        address receiver,
        address sender,
        bytes32 transactionId,
        uint256 requiredAmount
    ) internal virtual returns (bool isEntitled, bool isCrosschainPending) {
        IRolesBase.Role[] memory roles = _getRolesWithPermission(Permissions.JoinSpace);

        // PHASE 1: Check LOCAL entitlements first (no payment needed)
        if (_checkLocalEntitlements(roles, receiver)) return (true, false);

        // PHASE 2: No local entitlements passed - check crosschain entitlements
        return _checkCrosschainEntitlements(roles, receiver, sender, transactionId, requiredAmount);
    }

    /// @notice Checks local entitlements
    /// @param receiver The address to check entitlements for
    /// @return isLocallyEntitled True if user has local entitlements
    function _checkLocalEntitlements(
        IRolesBase.Role[] memory roles,
        address receiver
    ) internal view returns (bool isLocallyEntitled) {
        address[] memory linkedWallets = _getLinkedWalletsWithUser(receiver);

        for (uint256 i; i < roles.length; ++i) {
            if (roles[i].disabled) continue;

            for (uint256 j; j < roles[i].entitlements.length; ++j) {
                IEntitlement entitlement = IEntitlement(roles[i].entitlements[j]);

                // Check local entitlements first
                if (
                    !entitlement.isCrosschain() &&
                    entitlement.isEntitled(IN_TOWN, linkedWallets, JOIN_SPACE)
                ) {
                    // Local entitlement passed - return true (payment handled by existing flow)
                    return true;
                }
            }
        }
        return false;
    }

    /// @dev Checks all crosschain entitlements across roles. User passes if any check succeeds.
    /// Payment is escrowed only once (on first check) and returned when any check completes.
    function _checkCrosschainEntitlements(
        IRolesBase.Role[] memory roles,
        address receiver,
        address sender,
        bytes32 transactionId,
        uint256 requiredAmount
    ) internal returns (bool isEntitled, bool isCrosschainPending) {
        bool paymentSent;

        for (uint256 i; i < roles.length; ++i) {
            if (roles[i].disabled) continue;

            for (uint256 j; j < roles[i].entitlements.length; ++j) {
                IEntitlement entitlement = IEntitlement(roles[i].entitlements[j]);

                if (entitlement.isCrosschain()) {
                    _requestEntitlementCheck(
                        receiver,
                        sender,
                        transactionId,
                        IRuleEntitlement(address(entitlement)),
                        roles[i].id,
                        _getMembershipCurrency(),
                        paymentSent ? 0 : requiredAmount
                    );
                    paymentSent = true;
                    isCrosschainPending = true;
                }
            }
        }

        return (false, isCrosschainPending);
    }

    /// @notice Processes the charge for joining a space without referral
    /// @param transactionId The unique identifier for this join transaction
    /// @param joinDetails The pricing details for this join
    function _chargeForJoinSpace(
        bytes32 transactionId,
        PricingDetails memory joinDetails
    ) internal {
        (bytes4 selector, , address receiver, ) = abi.decode(
            _getCapturedData(transactionId),
            (bytes4, address, address, bytes)
        );

        if (selector != JOIN_SPACE_SELECTOR) {
            Membership__InvalidTransactionType.selector.revertWith();
        }

        address currency = _getMembershipCurrency();
        _payProtocolFee(currency, joinDetails.basePrice, joinDetails.protocolFee);

        emit MembershipPaid(currency, joinDetails.basePrice, joinDetails.protocolFee);

        _afterChargeForJoinSpace(transactionId, receiver, joinDetails.amountDue);
    }

    /// @notice Processes the charge for joining a space with referral
    /// @param transactionId The unique identifier for this join transaction
    /// @param joinDetails The pricing details for this join
    function _chargeForJoinSpaceWithReferral(
        bytes32 transactionId,
        PricingDetails memory joinDetails
    ) internal {
        (bytes4 selector, address sender, address receiver, bytes memory referralData) = abi.decode(
            _getCapturedData(transactionId),
            (bytes4, address, address, bytes)
        );

        if (selector != IMembership.joinSpaceWithReferral.selector) {
            Membership__InvalidTransactionType.selector.revertWith();
        }

        ReferralTypes memory referral = abi.decode(referralData, (ReferralTypes));

        address currency = _getMembershipCurrency();
        _payProtocolFee(currency, joinDetails.basePrice, joinDetails.protocolFee);
        _payPartnerFee(currency, referral.partner, joinDetails.basePrice);
        _payReferralFee(
            currency,
            sender,
            referral.userReferral,
            referral.referralCode,
            joinDetails.basePrice
        );

        emit MembershipPaid(currency, joinDetails.basePrice, joinDetails.protocolFee);

        _afterChargeForJoinSpace(transactionId, receiver, joinDetails.amountDue);
    }

    /// @notice Finalizes the charge after fees have been paid
    /// @dev Releases `paymentRequired` from captured value (leaving excess for refund),
    /// cleans up transaction data, and mints points. Called by both sync and async flows.
    /// @param transactionId The unique identifier for this join transaction
    /// @param receiver The address receiving the membership
    /// @param paymentRequired The amount consumed for payment (fees + owner proceeds)
    function _afterChargeForJoinSpace(
        bytes32 transactionId,
        address receiver,
        uint256 paymentRequired
    ) internal {
        _releaseCapturedValue(transactionId, paymentRequired);
        _deleteCapturedData(transactionId);

        _mintMembershipPoints(receiver, paymentRequired);
    }

    /// @notice Issues a membership token to the receiver
    /// @param receiver The address that will receive the membership token
    function _issueToken(address receiver) internal {
        // get token id
        uint256 tokenId = _nextTokenId();

        // set renewal price for token
        _setMembershipRenewalPrice(tokenId, _getMembershipPrice(_totalSupply()));

        // mint membership
        _safeMint(receiver, 1);

        // set expiration of membership
        _renewSubscription(tokenId, _getMembershipDuration());

        emit MembershipTokenIssued(receiver, tokenId);
    }

    /// @notice Validates if a user can join the space
    /// @param receiver The address that will receive the membership token
    function _validateJoinSpace(address receiver) internal view {
        if (receiver == address(0)) Membership__InvalidAddress.selector.revertWith();
        uint256 membershipSupplyLimit = _getMembershipSupplyLimit();
        if (membershipSupplyLimit != 0 && _totalSupply() >= membershipSupplyLimit) {
            Membership__MaxSupplyReached.selector.revertWith();
        }
    }

    /// @notice Refunds the remaining captured balance
    /// @dev NOTE: Currently refunds go to `receiver` (the membership recipient), not the original
    /// payer (msg.sender). This means if Alice pays for Bob's membership, excess ETH is refunded
    /// to Bob, not Alice. This design may change in a future update to refund the original payer.
    /// @param transactionId The unique identifier for this join transaction
    /// @param receiver The address to receive the refund (currently the membership receiver)
    function _refundBalance(bytes32 transactionId, address receiver) internal {
        uint256 userValue = _getCapturedValue(transactionId);
        if (userValue > 0) {
            _releaseCapturedValue(transactionId, userValue);
            CurrencyTransfer.transferCurrency(
                _getMembershipCurrency(),
                address(this),
                receiver,
                userValue
            );
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      FEE DISTRIBUTION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Pays the protocol fee via FeeManager
    /// @param currency The currency to pay in
    /// @param basePrice The base price of the membership (for fee calculation)
    /// @param expectedFee The pre-calculated protocol fee
    function _payProtocolFee(address currency, uint256 basePrice, uint256 expectedFee) internal {
        ProtocolFeeLib.charge(
            _getSpaceFactory(),
            _getMembershipFeeType(currency),
            msg.sender,
            currency,
            basePrice,
            expectedFee
        );
    }

    /// @notice Pays the referral fee if applicable
    /// @param currency The currency to pay in
    /// @param sender The original sender address (used for self-referral check)
    /// @param userReferral The user referral address
    /// @param referralCode The referral code used
    /// @param membershipPrice The price of the membership
    function _payReferralFee(
        address currency,
        address sender,
        address userReferral,
        string memory referralCode,
        uint256 membershipPrice
    ) internal {
        if (bytes(referralCode).length != 0) {
            Referral memory referral = _referralInfo(referralCode);

            if (referral.recipient == address(0) || referral.basisPoints == 0) return;

            uint256 referralFee = BasisPoints.calculate(membershipPrice, referral.basisPoints);

            CurrencyTransfer.transferCurrency(
                currency,
                address(this),
                referral.recipient,
                referralFee
            );
        } else if (userReferral != address(0)) {
            if (userReferral == sender) return;

            uint256 referralFee = BasisPoints.calculate(membershipPrice, _defaultBpsFee());

            CurrencyTransfer.transferCurrency(currency, address(this), userReferral, referralFee);
        }
    }

    /// @notice Pays the partner fee if applicable
    /// @param currency The currency to pay in
    /// @param partner The address of the partner
    /// @param membershipPrice The price of the membership
    function _payPartnerFee(address currency, address partner, uint256 membershipPrice) internal {
        if (partner == address(0)) return;

        Partner memory partnerInfo = IPartnerRegistry(_getSpaceFactory()).partnerInfo(partner);

        if (partnerInfo.fee == 0) return;

        uint256 partnerFee = BasisPoints.calculate(membershipPrice, partnerInfo.fee);

        CurrencyTransfer.transferCurrency(
            currency,
            address(this),
            partnerInfo.recipient,
            partnerFee
        );
    }

    function _renewMembership(address payer, uint256 tokenId) internal {
        address receiver = _ownerOf(tokenId);
        if (receiver == address(0)) Membership__InvalidAddress.selector.revertWith();

        uint256 duration = _getMembershipDuration();
        uint256 basePrice = _getMembershipRenewalPrice(tokenId, _totalSupply());
        address currency = _getMembershipCurrency();

        // Handle free renewal
        if (basePrice == 0) {
            // Refund any ETH sent (regardless of membership currency)
            CurrencyTransfer.transferCurrency(
                CurrencyTransfer.NATIVE_TOKEN,
                address(this),
                payer,
                msg.value
            );
            _renewSubscription(tokenId, uint64(duration));
            return;
        }

        (uint256 totalRequired, uint256 protocolFee) = _getTotalMembershipPayment(basePrice);

        if (currency == CurrencyTransfer.NATIVE_TOKEN) {
            // ETH payment: validate msg.value
            if (totalRequired > msg.value) Membership__InvalidPayment.selector.revertWith();

            _payProtocolFee(currency, basePrice, protocolFee);

            // Handle excess payment
            uint256 excess = msg.value - totalRequired;
            if (excess > 0) {
                CurrencyTransfer.transferCurrency(currency, address(this), payer, excess);
            }
        } else {
            // ERC20 payment: reject any ETH sent
            if (msg.value != 0) revert Membership__UnexpectedValue();

            // Transfer ERC20 from payer to contract
            _transferIn(currency, payer, totalRequired);

            _payProtocolFee(currency, basePrice, protocolFee);
        }

        emit MembershipPaid(currency, basePrice, protocolFee);
        _mintMembershipPoints(receiver, totalRequired);
        _renewSubscription(tokenId, uint64(duration));
    }

    /// @notice Mints points to a member based on their paid amount
    /// @dev Only mints points for ETH payments. ERC20 support requires oracle integration.
    /// @param receiver The address receiving the points
    /// @param paidAmount The amount paid for membership
    function _mintMembershipPoints(address receiver, uint256 paidAmount) internal {
        // No points for free memberships
        if (paidAmount == 0) return;

        // TODO: Add ERC20 support - requires price oracle to convert token amount to points
        if (_getMembershipCurrency() != CurrencyTransfer.NATIVE_TOKEN) return;

        address airdropDiamond = _getAirdropDiamond();
        uint256 points = _getPoints(
            airdropDiamond,
            ITownsPointsBase.Action.JoinSpace,
            abi.encode(paidAmount)
        );
        _mintPoints(airdropDiamond, receiver, points);
        _mintPoints(airdropDiamond, _owner(), points);
    }

    /// @notice Transfers tokens from an address to this contract
    /// @param currency The currency address (NATIVE_TOKEN for ETH, or ERC20 address)
    /// @param from The address to transfer from
    /// @param amount The amount to transfer
    function _transferIn(address currency, address from, uint256 amount) internal {
        if (currency == CurrencyTransfer.NATIVE_TOKEN) return;

        // Handle ERC20 tokens with fee-on-transfer check
        uint256 balanceBefore = currency.balanceOf(address(this));
        currency.safeTransferFrom(from, address(this), amount);
        uint256 balanceAfter = currency.balanceOf(address(this));

        if (balanceAfter - balanceBefore < amount) {
            Membership__InsufficientPayment.selector.revertWith();
        }
    }
}
