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
import {BasisPoints} from "../../../../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {Permissions} from "../../Permissions.sol";

// contracts
import {ERC5643Base} from "../../../../diamond/facets/token/ERC5643/ERC5643Base.sol";
import {DispatcherBase} from "../../dispatcher/DispatcherBase.sol";
import {Entitled} from "../../Entitled.sol";
import {EntitlementGatedBase} from "../../gated/EntitlementGatedBase.sol";
import {PointsBase} from "../../points/PointsBase.sol";
import {PrepayBase} from "../../prepay/PrepayBase.sol";
import {ReferralsBase} from "../../referrals/ReferralsBase.sol";
import {RolesBase} from "../../roles/RolesBase.sol";
import {MembershipBase} from "../MembershipBase.sol";

/// @title MembershipJoin
/// @notice Handles the logic for joining a space, including entitlement checks and payment
/// processing
/// @dev Inherits from multiple base contracts to provide comprehensive membership functionality
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
    PrepayBase,
    PointsBase
{
    using CustomRevert for bytes4;

    /// @notice Constant representing the permission to join a space
    bytes32 internal constant JOIN_SPACE = bytes32(abi.encodePacked(Permissions.JoinSpace));

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

    /// @notice Handles the process of joining a space
    /// @param receiver The address that will receive the membership token
    function _joinSpace(address receiver) internal {
        _validateJoinSpace(receiver);

        bool shouldCharge = _shouldChargeForJoinSpace();
        uint256 requiredAmount;
        if (shouldCharge) {
            requiredAmount = _validatePayment();
        }

        bytes4 selector = IMembership.joinSpace.selector;

        bytes32 transactionId = _registerTransaction(
            receiver,
            _encodeJoinSpaceData(selector, msg.sender, receiver, "")
        );

        (bool isEntitled, bool isCrosschainPending) = _checkEntitlement(
            receiver,
            msg.sender,
            transactionId,
            requiredAmount
        );

        if (!isCrosschainPending) {
            if (isEntitled) {
                if (shouldCharge) _chargeForJoinSpace(transactionId);
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
    function _joinSpaceWithReferral(address receiver, ReferralTypes memory referral) internal {
        _validateJoinSpace(receiver);

        bool shouldCharge = _shouldChargeForJoinSpace();
        uint256 requiredAmount;
        if (shouldCharge) {
            requiredAmount = _validatePayment();
        }

        _validateUserReferral(receiver, referral);

        bytes memory referralData = abi.encode(referral);

        bytes4 selector = IMembership.joinSpaceWithReferral.selector;

        bytes32 transactionId = _registerTransaction(
            receiver,
            _encodeJoinSpaceData(selector, msg.sender, receiver, referralData)
        );

        (bool isEntitled, bool isCrosschainPending) = _checkEntitlement(
            receiver,
            msg.sender,
            transactionId,
            requiredAmount
        );

        if (!isCrosschainPending) {
            if (isEntitled) {
                if (shouldCharge) _chargeForJoinSpaceWithReferral(transactionId);

                _refundBalance(transactionId, receiver);
                _issueToken(receiver);
            } else {
                _rejectMembership(transactionId, receiver);
            }
        }
    }

    function _rejectMembership(bytes32 transactionId, address receiver) internal {
        _captureData(transactionId, "");
        _refundBalance(transactionId, receiver);
        emit MembershipTokenRejected(receiver);
    }

    function _getRequiredAmount(uint256 price) internal view returns (uint256) {
        // Check if there are any prepaid memberships available
        uint256 prepaidSupply = _getPrepaidSupply();
        if (prepaidSupply > 0) return 0; // If prepaid memberships exist, no payment is required

        if (price == 0) return 0; // If the price is zero, no payment is required

        return price;
    }

    function _validatePayment() internal view returns (uint256 requiredAmount) {
        // Get the current membership price based on total supply
        uint256 membershipPrice = _getMembershipPrice(_totalSupply());
        requiredAmount = _getRequiredAmount(membershipPrice);
        if (msg.value < requiredAmount) {
            CustomRevert.revertWith(Membership__InsufficientPayment.selector);
        }
    }

    function _validateUserReferral(address receiver, ReferralTypes memory referral) internal view {
        if (referral.userReferral != address(0)) {
            if (referral.userReferral == receiver || referral.userReferral == msg.sender) {
                CustomRevert.revertWith(Membership__InvalidAddress.selector);
            }
        }
    }

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
        if (_checkLocalEntitlements(roles, receiver)) {
            return (true, false);
        }

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

    /// @notice Handles crosschain entitlement checks with proper payment distribution
    /// @param receiver The address to check entitlements for
    /// @param sender The address sending the transaction
    /// @param transactionId The transaction identifier
    /// @param requiredAmount The required payment amount
    /// @return isEntitled Whether user is entitled (always false for crosschain)
    /// @return isCrosschainPending Whether crosschain checks are pending
    function _checkCrosschainEntitlements(
        IRolesBase.Role[] memory roles,
        address receiver,
        address sender,
        bytes32 transactionId,
        uint256 requiredAmount
    ) internal returns (bool isEntitled, bool isCrosschainPending) {
        bool paymentSent = false;

        for (uint256 i; i < roles.length; ++i) {
            if (roles[i].disabled) continue;

            for (uint256 j; j < roles[i].entitlements.length; ++j) {
                IEntitlement entitlement = IEntitlement(roles[i].entitlements[j]);

                if (entitlement.isCrosschain()) {
                    if (!paymentSent) {
                        // Send only the required amount to crosschain check
                        // Excess will be handled by existing refund mechanisms
                        _requestEntitlementCheckV2(
                            receiver,
                            sender,
                            transactionId,
                            IRuleEntitlement(address(entitlement)),
                            roles[i].id,
                            requiredAmount
                        );
                        paymentSent = true;
                    } else {
                        _requestEntitlementCheckV2(
                            receiver,
                            sender,
                            transactionId,
                            IRuleEntitlement(address(entitlement)),
                            roles[i].id,
                            0
                        );
                    }
                    isCrosschainPending = true;
                }
            }
        }

        return (false, isCrosschainPending);
    }

    /// @notice Determines if a charge should be applied for joining the space
    /// @return shouldCharge A boolean indicating whether a charge should be applied
    function _shouldChargeForJoinSpace() internal returns (bool shouldCharge) {
        uint256 totalSupply = _totalSupply();
        uint256 freeAllocation = _getMembershipFreeAllocation();
        uint256 prepaidSupply = _getPrepaidSupply();

        if (freeAllocation > totalSupply) {
            return false;
        }

        if (prepaidSupply > 0) {
            _reducePrepay(1);
            return false;
        }

        return true;
    }

    /// @notice Processes the charge for joining a space without referral
    /// @param transactionId The unique identifier for this join transaction
    function _chargeForJoinSpace(bytes32 transactionId) internal {
        uint256 membershipPrice = _getMembershipPrice(_totalSupply());
        uint256 paymentRequired = _getRequiredAmount(membershipPrice);

        (bytes4 selector, address sender, address receiver, ) = abi.decode(
            _getCapturedData(transactionId),
            (bytes4, address, address, bytes)
        );

        if (selector != IMembership.joinSpace.selector) {
            CustomRevert.revertWith(Membership__InvalidTransactionType.selector);
        }

        uint256 protocolFee = _collectProtocolFee(sender, membershipPrice);
        uint256 ownerProceeds = paymentRequired - protocolFee;

        _afterChargeForJoinSpace(
            transactionId,
            sender,
            receiver,
            paymentRequired,
            ownerProceeds,
            membershipPrice
        );
    }

    /// @notice Processes the charge for joining a space with referral
    /// @param transactionId The unique identifier for this join transaction
    function _chargeForJoinSpaceWithReferral(bytes32 transactionId) internal {
        uint256 membershipPrice = _getMembershipPrice(_totalSupply());
        uint256 paymentRequired = _getRequiredAmount(membershipPrice);

        (bytes4 selector, address sender, address receiver, bytes memory referralData) = abi.decode(
            _getCapturedData(transactionId),
            (bytes4, address, address, bytes)
        );

        if (selector != IMembership.joinSpaceWithReferral.selector) {
            CustomRevert.revertWith(Membership__InvalidTransactionType.selector);
        }

        ReferralTypes memory referral = abi.decode(referralData, (ReferralTypes));

        uint256 ownerProceeds;
        {
            uint256 protocolFee = _collectProtocolFee(sender, membershipPrice);

            uint256 partnerFee = _collectPartnerFee(sender, referral.partner, membershipPrice);

            uint256 referralFee = _collectReferralCodeFee(
                sender,
                referral.userReferral,
                referral.referralCode,
                membershipPrice
            );

            ownerProceeds = paymentRequired - protocolFee - partnerFee - referralFee;
        }

        _afterChargeForJoinSpace(
            transactionId,
            sender,
            receiver,
            paymentRequired,
            ownerProceeds,
            membershipPrice
        );
    }

    function _afterChargeForJoinSpace(
        bytes32 transactionId,
        address payer,
        address receiver,
        uint256 paymentRequired,
        uint256 ownerProceeds,
        uint256 membershipPrice
    ) internal {
        // account for owner's proceeds
        if (ownerProceeds != 0) _transferIn(payer, ownerProceeds);

        _releaseCapturedValue(transactionId, paymentRequired);
        _captureData(transactionId, "");

        _mintMembershipPoints(receiver, membershipPrice);
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

        // emit event
        emit MembershipTokenIssued(receiver, tokenId);
    }

    /// @notice Validates if a user can join the space
    /// @param receiver The address that will receive the membership token
    function _validateJoinSpace(address receiver) internal view {
        if (receiver == address(0)) {
            CustomRevert.revertWith(Membership__InvalidAddress.selector);
        }
        uint256 membershipSupplyLimit = _getMembershipSupplyLimit();
        if (membershipSupplyLimit != 0 && _totalSupply() >= membershipSupplyLimit) {
            CustomRevert.revertWith(Membership__MaxSupplyReached.selector);
        }
    }

    /// @notice Refunds the balance to the sender if necessary
    /// @param transactionId The unique identifier for this join transaction
    /// @param sender The address of the sender to refund
    function _refundBalance(bytes32 transactionId, address sender) internal {
        uint256 userValue = _getCapturedValue(transactionId);
        if (userValue > 0) {
            _releaseCapturedValue(transactionId, userValue);
            CurrencyTransfer.transferCurrency(
                _getMembershipCurrency(),
                address(this),
                sender,
                userValue
            );
        }
    }

    /// @notice Collects the referral fee if applicable
    /// @param payer The address of the payer
    /// @param referralCode The referral code used
    /// @param membershipPrice The price of the membership
    /// @return referralFee The amount of referral fee collected
    function _collectReferralCodeFee(
        address payer,
        address userReferral,
        string memory referralCode,
        uint256 membershipPrice
    ) internal returns (uint256 referralFee) {
        if (bytes(referralCode).length != 0) {
            Referral memory referral = _referralInfo(referralCode);

            if (referral.recipient == address(0) || referral.basisPoints == 0) {
                return 0;
            }

            referralFee = BasisPoints.calculate(membershipPrice, referral.basisPoints);

            CurrencyTransfer.transferCurrency(
                _getMembershipCurrency(),
                payer,
                referral.recipient,
                referralFee
            );
        } else if (userReferral != address(0)) {
            if (userReferral == payer) return 0;

            referralFee = BasisPoints.calculate(membershipPrice, _defaultBpsFee());

            CurrencyTransfer.transferCurrency(
                _getMembershipCurrency(),
                payer,
                userReferral,
                referralFee
            );
        }
    }

    /// @notice Collects the partner fee if applicable
    /// @param payer The address of the payer
    /// @param partner The address of the partner
    /// @param membershipPrice The price of the membership
    /// @return partnerFee The amount of partner fee collected
    function _collectPartnerFee(
        address payer,
        address partner,
        uint256 membershipPrice
    ) internal returns (uint256 partnerFee) {
        if (partner == address(0)) return 0;

        Partner memory partnerInfo = IPartnerRegistry(_getSpaceFactory()).partnerInfo(partner);

        if (partnerInfo.fee == 0) return 0;

        partnerFee = BasisPoints.calculate(membershipPrice, partnerInfo.fee);

        CurrencyTransfer.transferCurrency(
            _getMembershipCurrency(),
            payer,
            partnerInfo.recipient,
            partnerFee
        );
    }

    function _renewMembership(address payer, uint256 tokenId) internal {
        address receiver = _ownerOf(tokenId);

        if (receiver == address(0)) {
            Membership__InvalidAddress.selector.revertWith();
        }

        uint256 duration = _getMembershipDuration();
        uint256 membershipPrice = _getMembershipRenewalPrice(tokenId, _totalSupply());

        if (membershipPrice > msg.value) {
            Membership__InvalidPayment.selector.revertWith();
        }

        _mintMembershipPoints(receiver, membershipPrice);

        uint256 protocolFee = _collectProtocolFee(payer, membershipPrice);

        uint256 remainingDue = membershipPrice - protocolFee;
        if (remainingDue > 0) _transferIn(payer, remainingDue);

        uint256 excess = msg.value - membershipPrice;
        if (excess > 0) {
            CurrencyTransfer.transferCurrency(
                _getMembershipCurrency(),
                address(this),
                payer,
                excess
            );
        }

        _renewSubscription(tokenId, uint64(duration));
    }

    /// @notice Mints points to a member based on their paid amount
    /// @dev This function handles point minting for both new joins and renewals
    /// @param receiver The address receiving the points
    /// @param paidAmount The amount paid for membership
    function _mintMembershipPoints(address receiver, uint256 paidAmount) internal {
        // calculate points and credit them
        address airdropDiamond = _getAirdropDiamond();
        uint256 points = _getPoints(
            airdropDiamond,
            ITownsPointsBase.Action.JoinSpace,
            abi.encode(paidAmount)
        );
        _mintPoints(airdropDiamond, receiver, points);
        _mintPoints(airdropDiamond, _owner(), points);
    }
}
