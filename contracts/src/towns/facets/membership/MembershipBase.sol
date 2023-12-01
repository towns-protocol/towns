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
    MembershipInfo memory info,
    address townFactory
  ) internal {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    ds.townFactory = townFactory;

    _verifyDuration(info.duration);
    _verifyRecipient(info.feeRecipient);
    _verifyFreeAllocation(info.freeAllocation);

    ds.membershipMaxSupply = info.maxSupply;
    ds.membershipCurrency = info.currency == address(0)
      ? CurrencyTransfer.NATIVE_TOKEN
      : info.currency;
    ds.membershipPrice = info.price;
    ds.membershipDuration = info.duration;
    ds.membershipFeeRecipient = info.feeRecipient;
    ds.freeAllocation = info.freeAllocation;
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
  function _verifyDuration(uint64 duration) internal view {
    // verify it's not more than platform max
    if (
      duration >
      IPlatformRequirements(_getTownFactory()).getMembershipDuration()
    ) revert Membership__InvalidDuration();
  }

  function _getMembershipDuration() internal view returns (uint64) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    if (ds.membershipDuration > 0) return ds.membershipDuration;

    return IPlatformRequirements(ds.townFactory).getMembershipDuration();
  }

  function _setMembershipDuration(uint64 newDuration) internal {
    MembershipStorage.layout().membershipDuration = newDuration;
  }

  // =============================================================
  //                           Pricing
  // =============================================================
  function _verifyPrice(uint256 newPrice) internal view {
    uint256 minPrice = IPlatformRequirements(_getTownFactory())
      .getMembershipFee();
    if (newPrice < minPrice) revert Membership__PriceTooLow();
  }

  function _setMembershipPrice(uint256 newPrice) public {
    MembershipStorage.layout().membershipPrice = newPrice;
  }

  /// @dev Makes it virtual to allow other pricing strategies
  function _getMembershipPrice() public view virtual returns (uint256) {
    return MembershipStorage.layout().membershipPrice;
  }

  // =============================================================
  //                           Allocation
  // =============================================================
  function _verifyFreeAllocation(uint256 newAllocation) internal view {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    // verify newLimit is not more than the allowed platform limit
    if (
      newAllocation >
      IPlatformRequirements(ds.townFactory).getMembershipMintLimit()
    ) revert Membership__InvalidFreeAllocation();
  }

  function _setMembershipFreeAllocation(uint256 newAllocation) public {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();
    ds.freeAllocation = newAllocation;
    emit MembershipFreeAllocationUpdated(newAllocation);
  }

  function _getMembershipFreeAllocation() public view returns (uint256) {
    uint256 freeAllocation = MembershipStorage.layout().freeAllocation;

    if (freeAllocation > 0) return freeAllocation;

    return
      IPlatformRequirements(MembershipStorage.layout().townFactory)
        .getMembershipMintLimit();
  }

  // =============================================================
  //                   Token Max Supply Limits
  // =============================================================
  function _verifyMaxSupply(
    uint256 newLimit,
    uint256 totalSupply
  ) internal view {
    // if the new limit is less than the current total supply, revert
    if (newLimit < totalSupply) revert Membership__InvalidMaxSupply();

    // if the new limit is less than the current max supply, revert
    if (newLimit <= _getMembershipSupplyLimit())
      revert Membership__InvalidMaxSupply();
  }

  function _setMembershipSupplyLimit(uint256 newLimit) public {
    MembershipStorage.layout().membershipMaxSupply = newLimit;
  }

  function _getMembershipSupplyLimit() public view returns (uint256) {
    return MembershipStorage.layout().membershipMaxSupply;
  }

  // =============================================================
  //                           Currency
  // =============================================================
  function _verifyCurrency(address currency) internal pure {
    if (currency == address(0)) revert Membership__InvalidCurrency();
  }

  function _setMembershipCurrency(address newCurrency) public {
    MembershipStorage.layout().membershipCurrency = newCurrency;
  }

  function _getMembershipCurrency() public view returns (address) {
    return MembershipStorage.layout().membershipCurrency;
  }

  // =============================================================
  //                           Recipient
  // =============================================================
  function _verifyRecipient(address recipient) internal pure {
    if (recipient == address(0)) revert Membership__InvalidFeeRecipient();
  }

  function _setMembershipFeeRecipient(address newRecipient) public {
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
