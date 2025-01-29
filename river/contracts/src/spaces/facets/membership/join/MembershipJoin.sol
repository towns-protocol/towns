// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IPartnerRegistryBase, IPartnerRegistry} from "contracts/src/factory/facets/partner/IPartnerRegistry.sol";
import {IImplementationRegistry} from "contracts/src/factory/facets/registry/IImplementationRegistry.sol";
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {ITownsPoints, ITownsPointsBase} from "contracts/src/airdrop/points/ITownsPoints.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

// contracts
import {MembershipBase} from "contracts/src/spaces/facets/membership/MembershipBase.sol";
import {DispatcherBase} from "contracts/src/spaces/facets/dispatcher/DispatcherBase.sol";
import {RolesBase} from "contracts/src/spaces/facets/roles/RolesBase.sol";
import {Entitled} from "contracts/src/spaces/facets/Entitled.sol";
import {PrepayBase} from "contracts/src/spaces/facets/prepay/PrepayBase.sol";
import {ReferralsBase} from "contracts/src/spaces/facets/referrals/ReferralsBase.sol";
import {EntitlementGatedBase} from "contracts/src/spaces/facets/gated/EntitlementGatedBase.sol";

/// @title MembershipJoin
/// @notice Handles the logic for joining a space, including entitlement checks and payment processing
/// @dev Inherits from multiple base contracts to provide comprehensive membership functionality
abstract contract MembershipJoin is
  IRolesBase,
  IPartnerRegistryBase,
  MembershipBase,
  ReferralsBase,
  DispatcherBase,
  RolesBase,
  EntitlementGatedBase,
  Entitled,
  PrepayBase
{
  /// @notice Constant representing the permission to join a space
  bytes32 internal constant JOIN_SPACE =
    bytes32(abi.encodePacked(Permissions.JoinSpace));

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

  /// @notice Handles the process of joining a space with a referral
  /// @param receiver The address that will receive the membership token
  /// @param referral The referral information
  function _joinSpaceWithReferral(
    address receiver,
    ReferralTypes memory referral
  ) internal {
    _validateJoinSpace(receiver);
    _validatePayment();
    _validateUserReferral(receiver, referral);
    bool isNotReferral = _isNotReferral(referral);

    bytes memory referralData = isNotReferral
      ? bytes("")
      : abi.encode(referral);

    bytes4 selector = isNotReferral
      ? IMembership.joinSpace.selector
      : IMembership.joinSpaceWithReferral.selector;

    bytes32 transactionId = _registerTransaction(
      receiver,
      _encodeJoinSpaceData(selector, msg.sender, receiver, referralData)
    );

    (bool isEntitled, bool isCrosschainPending) = _checkEntitlement(
      receiver,
      transactionId
    );

    if (!isCrosschainPending) {
      if (isEntitled) {
        bool shouldCharge = _shouldChargeForJoinSpace();
        if (shouldCharge) {
          if (isNotReferral) {
            _chargeForJoinSpace(transactionId);
          } else {
            _chargeForJoinSpaceWithReferral(transactionId);
          }
        } else {
          _refundBalance(transactionId, msg.sender);
        }

        _issueToken(receiver);
      } else {
        _captureData(transactionId, "");
        _refundBalance(transactionId, msg.sender);
        emit MembershipTokenRejected(receiver);
      }
    }
  }

  function _getRequiredAmount() internal view returns (uint256) {
    // Check if there are any prepaid memberships available
    uint256 prepaidSupply = _getPrepaidSupply();
    if (prepaidSupply > 0) return 0; // If prepaid memberships exist, no payment is required

    // Get the current membership price based on total supply
    uint256 price = _getMembershipPrice(_totalSupply());
    if (price == 0) return 0; // If the price is zero, no payment is required

    // Calculate the protocol fee
    uint256 fee = _getProtocolFee(price);

    // Return the higher of the price or fee to ensure at least the protocol fee is covered
    return FixedPointMathLib.max(price, fee);
  }

  function _validatePayment() internal view {
    if (msg.value > 0) {
      uint256 requiredAmount = _getRequiredAmount();
      if (msg.value != requiredAmount)
        CustomRevert.revertWith(Membership__InvalidPayment.selector);
    }
  }

  function _validateUserReferral(
    address receiver,
    ReferralTypes memory referral
  ) internal view {
    if (referral.userReferral != address(0)) {
      if (
        referral.userReferral == receiver || referral.userReferral == msg.sender
      ) CustomRevert.revertWith(Membership__InvalidAddress.selector);
    }
  }

  function _isNotReferral(
    ReferralTypes memory referral
  ) internal pure returns (bool) {
    return
      referral.partner == address(0) &&
      referral.userReferral == address(0) &&
      bytes(referral.referralCode).length == 0;
  }

  /// @notice Checks if a user is entitled to join the space and handles the entitlement process
  /// @dev This function checks both local and crosschain entitlements
  /// @param receiver The address of the user trying to join the space
  /// @param transactionId The unique identifier for this join transaction
  /// @return isEntitled A boolean indicating whether the user is entitled to join
  /// @return isCrosschainPending A boolean indicating if a crosschain entitlement check is pending
  function _checkEntitlement(
    address receiver,
    bytes32 transactionId
  ) internal returns (bool isEntitled, bool isCrosschainPending) {
    IRolesBase.Role[] memory roles = _getRolesWithPermission(
      Permissions.JoinSpace
    );
    address[] memory linkedWallets = _getLinkedWalletsWithUser(receiver);

    uint256 totalRoles = roles.length;

    for (uint256 i; i < totalRoles; ++i) {
      Role memory role = roles[i];
      if (role.disabled) continue;

      for (uint256 j; j < role.entitlements.length; ++j) {
        IEntitlement entitlement = IEntitlement(role.entitlements[j]);

        if (entitlement.isEntitled(IN_TOWN, linkedWallets, JOIN_SPACE)) {
          isEntitled = true;
          return (isEntitled, false);
        }

        if (entitlement.isCrosschain()) {
          _requestEntitlementCheck(
            receiver,
            transactionId,
            IRuleEntitlement(address(entitlement)),
            role.id
          );
          isCrosschainPending = true;
        }
      }
    }

    return (isEntitled, isCrosschainPending);
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
    uint256 payment = _getCapturedValue(transactionId);
    if (payment == 0)
      CustomRevert.revertWith(Membership__InsufficientPayment.selector);

    (bytes4 selector, address sender, address receiver, ) = abi.decode(
      _getCapturedData(transactionId),
      (bytes4, address, address, bytes)
    );

    if (selector != IMembership.joinSpace.selector) {
      CustomRevert.revertWith(Membership__InvalidTransactionType.selector);
    }

    uint256 protocolFee = _collectProtocolFee(sender, payment);
    uint256 remainingDue = payment - protocolFee;

    _afterChargeForJoinSpace(
      transactionId,
      sender,
      receiver,
      payment,
      remainingDue,
      protocolFee
    );
  }

  /// @notice Processes the charge for joining a space with referral
  /// @param transactionId The unique identifier for this join transaction
  function _chargeForJoinSpaceWithReferral(bytes32 transactionId) internal {
    uint256 payment = _getCapturedValue(transactionId);
    if (payment == 0)
      CustomRevert.revertWith(Membership__InsufficientPayment.selector);

    (
      bytes4 selector,
      address sender,
      address receiver,
      bytes memory referralData
    ) = abi.decode(
        _getCapturedData(transactionId),
        (bytes4, address, address, bytes)
      );

    if (selector != IMembership.joinSpaceWithReferral.selector) {
      CustomRevert.revertWith(Membership__InvalidTransactionType.selector);
    }

    ReferralTypes memory referral = abi.decode(referralData, (ReferralTypes));

    uint256 protocolFee = _collectProtocolFee(sender, payment);

    uint256 partnerFee = _collectPartnerFee(sender, referral.partner, payment);

    uint256 referralFee = _collectReferralCodeFee(
      sender,
      referral.userReferral,
      referral.referralCode,
      payment
    );

    uint256 remainingDue = payment - protocolFee - partnerFee - referralFee;

    _afterChargeForJoinSpace(
      transactionId,
      sender,
      receiver,
      payment,
      remainingDue,
      protocolFee
    );
  }

  function _afterChargeForJoinSpace(
    bytes32 transactionId,
    address payer,
    address receiver,
    uint256 payment,
    uint256 remainingDue,
    uint256 protocolFee
  ) internal {
    if (remainingDue != 0) _transferIn(payer, remainingDue);

    _releaseCapturedValue(transactionId, payment);
    _captureData(transactionId, "");

    // calculate points and credit them
    ITownsPoints pointsToken = ITownsPoints(
      IImplementationRegistry(_getSpaceFactory()).getLatestImplementation(
        bytes32("RiverAirdrop")
      )
    );
    uint256 points = pointsToken.getPoints(
      ITownsPointsBase.Action.JoinSpace,
      abi.encode(protocolFee)
    );

    pointsToken.mint(receiver, points);
    pointsToken.mint(_owner(), points);
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
    if (receiver == address(0))
      CustomRevert.revertWith(Membership__InvalidAddress.selector);
    uint256 membershipSupplyLimit = _getMembershipSupplyLimit();
    if (membershipSupplyLimit != 0 && _totalSupply() >= membershipSupplyLimit)
      CustomRevert.revertWith(Membership__MaxSupplyReached.selector);
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

      if (referral.recipient == address(0) || referral.basisPoints == 0)
        return 0;

      referralFee = BasisPoints.calculate(
        membershipPrice,
        referral.basisPoints
      );

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

    Partner memory partnerInfo = IPartnerRegistry(_getSpaceFactory())
      .partnerInfo(partner);

    if (partnerInfo.fee == 0) return 0;

    partnerFee = BasisPoints.calculate(membershipPrice, partnerInfo.fee);

    CurrencyTransfer.transferCurrency(
      _getMembershipCurrency(),
      payer,
      partnerInfo.recipient,
      partnerFee
    );
  }
}
