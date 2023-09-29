// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IMembershipBase} from "./IMembership.sol";
import {IPlatformRequirements} from "contracts/src/towns/facets/platform/requirements/IPlatformRequirements.sol";

// libraries
import {MembershipStorage} from "./MembershipStorage.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
abstract contract MembershipBase is IMembershipBase {
  function __MembershipBase_init(
    uint256 membershipPrice,
    uint256 membershipLimit,
    address membershipCurrency,
    address membershipFeeRecipient,
    address townFactory
  ) internal {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();
    ds.membershipPrice = membershipPrice;
    ds.membershipLimit = membershipLimit;
    ds.membershipCurrency = membershipCurrency == address(0)
      ? CurrencyTransfer.NATIVE_TOKEN
      : membershipCurrency;
    ds.membershipFeeRecipient = membershipFeeRecipient;
    ds.townFactory = townFactory;
  }

  // =============================================================
  //                           Membership
  // =============================================================
  function _setMembershipTokenId(uint256 tokenId, address member) internal {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    ds.memberByTokenId[tokenId] = member;
    ds.tokenIdByMember[member] = tokenId;
  }

  function _getMembershipByTokenId(
    uint256 tokenId
  ) internal view returns (address) {
    return MembershipStorage.layout().memberByTokenId[tokenId];
  }

  function _getTokenIdByMembership(
    address member
  ) internal view returns (uint256) {
    return MembershipStorage.layout().tokenIdByMember[member];
  }

  function _collectMembershipFee(address buyer) internal {
    uint256 membershipPrice = _getMembershipPrice();

    if (membershipPrice == 0) return;

    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    uint256 protocolFee = IPlatformRequirements(ds.townFactory)
      .getMembershipFee();

    if (membershipPrice < protocolFee) revert Membership__InsufficientPayment();

    address feeRecipient = IPlatformRequirements(ds.townFactory)
      .getFeeRecipient();
    uint16 bpsFee = IPlatformRequirements(ds.townFactory).getMembershipBps();
    uint256 denominator = IPlatformRequirements(ds.townFactory)
      .getDenominator();

    uint256 surplus = membershipPrice - protocolFee;

    // if the price is greater than the flat fee, take the bps fee on the difference
    if (surplus > 0) {
      protocolFee = ((surplus * bpsFee) / denominator) + protocolFee;
    }

    //transfer the platform fee to the platform fee recipient
    CurrencyTransfer.transferCurrency(
      ds.membershipCurrency,
      buyer, // from
      feeRecipient, // to
      protocolFee
    );

    if (surplus == 0) return;

    //transfer the rest to the membership fee recipient
    CurrencyTransfer.transferCurrency(
      ds.membershipCurrency,
      buyer, // from
      ds.membershipFeeRecipient, // to
      membershipPrice - protocolFee
    );
  }

  // =============================================================
  //                           Duration
  // =============================================================
  function _getMembershipDuration() internal view returns (uint64) {
    return
      IPlatformRequirements(MembershipStorage.layout().townFactory)
        .getMembershipDuration();
  }

  // =============================================================
  //                           Pricing
  // =============================================================
  function _setMembershipPrice(uint256 newPrice) public {
    if (newPrice < 0) revert Membership__InvalidPrice();

    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    // verify currency is set as well
    if (ds.membershipCurrency == address(0))
      revert Membership__InvalidCurrency();

    uint256 protocolFee = IPlatformRequirements(ds.townFactory)
      .getMembershipFee();

    if (newPrice < protocolFee) revert Membership__PriceTooLow();

    ds.membershipPrice = newPrice;
  }

  /// @dev Makes it virtual to allow other pricing strategies
  function _getMembershipPrice() public view virtual returns (uint256) {
    return MembershipStorage.layout().membershipPrice;
  }

  // =============================================================
  //                           Limits
  // =============================================================
  function _setMembershipLimit(uint256 newLimit) public {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    uint256 maxLimit = IPlatformRequirements(ds.townFactory)
      .getMembershipMintLimit();

    if (newLimit > maxLimit) revert Membership__InvalidLimit();

    MembershipStorage.layout().membershipLimit = newLimit;
  }

  function _getMembershipLimit() public view returns (uint256) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    if (ds.membershipLimit == 0) {
      return IPlatformRequirements(ds.townFactory).getMembershipMintLimit();
    } else {
      return ds.membershipLimit;
    }
  }

  // =============================================================
  //                           Currency
  // =============================================================
  function _setMembershipCurrency(address newCurrency) public {
    if (newCurrency == address(0)) revert Membership__InvalidCurrency();
    MembershipStorage.layout().membershipCurrency = newCurrency;
  }

  function _getMembershipCurrency() public view returns (address) {
    return MembershipStorage.layout().membershipCurrency;
  }

  // =============================================================
  //                           Recipient
  // =============================================================
  function _setMembershipFeeRecipient(address newRecipient) public {
    if (newRecipient == address(0)) revert Membership__InvalidFeeRecipient();
    MembershipStorage.layout().membershipFeeRecipient = newRecipient;
  }

  function _getMembershipFeeRecipient() public view returns (address) {
    return MembershipStorage.layout().membershipFeeRecipient;
  }

  // =============================================================
  //                           Factory
  // =============================================================
  function _getTownFactory() public view returns (address) {
    return MembershipStorage.layout().townFactory;
  }
}
