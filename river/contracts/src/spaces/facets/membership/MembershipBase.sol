// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMembershipBase} from "./IMembership.sol";
import {IPlatformRequirements} from "contracts/src/spaces/facets/platform/requirements/IPlatformRequirements.sol";
import {IERC165} from "contracts/src/diamond/facets/introspection/IERC165.sol";
import {IMembershipPricing} from "./pricing/IMembershipPricing.sol";
import {IPrepay} from "contracts/src/spaces/facets/prepay/IPrepay.sol";

// libraries
import {MembershipStorage} from "./MembershipStorage.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

abstract contract MembershipBase is IMembershipBase {
  function __MembershipBase_init(
    Membership memory info,
    address spaceFactory
  ) internal {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    ds.spaceFactory = spaceFactory;

    _verifyDuration(info.duration);
    _verifyRecipient(info.feeRecipient);
    _verifyFreeAllocation(info.freeAllocation);
    _verifyPricingModule(info.pricingModule);

    ds.membershipMaxSupply = info.maxSupply;
    ds.membershipCurrency = info.currency == address(0)
      ? CurrencyTransfer.NATIVE_TOKEN
      : info.currency;
    ds.membershipPrice = info.price;
    ds.membershipDuration = info.duration;
    ds.membershipFeeRecipient = info.feeRecipient;
    ds.freeAllocation = info.freeAllocation;
    ds.pricingModule = info.pricingModule;
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

  function _collectProtocolFee(
    address buyer,
    uint256 membershipPrice
  ) internal returns (uint256 protocolFeeBps) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();
    IPlatformRequirements platform = IPlatformRequirements(ds.spaceFactory);

    // Compute fees and recipient addresses
    address platformRecipient = platform.getFeeRecipient();
    uint16 bpsFee = platform.getMembershipBps();
    protocolFeeBps = BasisPoints.calculate(membershipPrice, bpsFee);

    //transfer the platform fee to the platform fee recipient
    _transferOut(buyer, platformRecipient, protocolFeeBps);
  }

  function _transferOut(address from, address to, uint256 fee) internal {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    //transfer a fee to a user
    CurrencyTransfer.transferCurrency(
      ds.membershipCurrency,
      from, // from
      to, // to
      fee
    );
  }

  // =============================================================
  //                           Duration
  // =============================================================
  function _verifyDuration(uint64 duration) internal view {
    // verify it's not more than platform max
    if (
      duration >
      IPlatformRequirements(_getSpaceFactory()).getMembershipDuration()
    ) revert Membership__InvalidDuration();
  }

  function _getMembershipDuration() internal view returns (uint64) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    if (ds.membershipDuration > 0) return ds.membershipDuration;

    return IPlatformRequirements(ds.spaceFactory).getMembershipDuration();
  }

  function _setMembershipDuration(uint64 newDuration) internal {
    MembershipStorage.layout().membershipDuration = newDuration;
  }

  // =============================================================
  //                        Pricing Module
  // =============================================================
  function _verifyPricingModule(address pricingModule) internal view {
    if (pricingModule == address(0)) return;

    if (
      !IERC165(pricingModule).supportsInterface(
        type(IMembershipPricing).interfaceId
      )
    ) revert Membership__InvalidPricingModule();
  }

  function _setPricingModule(address newPricingModule) public {
    MembershipStorage.layout().pricingModule = newPricingModule;
  }

  function _getPricingModule() public view returns (address) {
    return MembershipStorage.layout().pricingModule;
  }

  // =============================================================
  //                           Pricing
  // =============================================================
  function _verifyPrice(uint256 newPrice) internal view {
    uint256 minPrice = IPlatformRequirements(_getSpaceFactory())
      .getMembershipFee();
    if (newPrice < minPrice) revert Membership__PriceTooLow();
  }

  function _setMembershipPrice(uint256 newPrice) public {
    IPlatformRequirements platform = IPlatformRequirements(_getSpaceFactory());

    // Get base protocol fee
    uint256 membershipMinPrice = platform.getMembershipFee();
    if (newPrice < membershipMinPrice) revert Membership__PriceTooLow();

    MembershipStorage.layout().membershipPrice = newPrice;
  }

  /// @dev Makes it virtual to allow other pricing strategies
  function _getMembershipPrice(
    uint256 totalSupply
  ) public view virtual returns (uint256) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    // get free allocation
    uint256 freeAllocation = _getMembershipFreeAllocation();

    // if the free allocation is greater than the total supply, return 0
    if (freeAllocation > totalSupply) return 0;

    // if the total supply is greater than the free allocation, but you have a prepaid balance return 0
    if (
      IPrepay(ds.spaceFactory).prepaidMembershipSupply(address(this)) >
      totalSupply
    ) return 0;

    if (ds.pricingModule != address(0))
      return
        IMembershipPricing(ds.pricingModule).getPrice(
          freeAllocation,
          totalSupply
        );

    return ds.membershipPrice;
  }

  function _setMembershipRenewalPrice(
    uint256 tokenId,
    uint256 pricePaid
  ) internal {
    MembershipStorage.layout().renewalPriceByTokenId[tokenId] = pricePaid;
  }

  function _getMembershipRenewalPrice(
    uint256 tokenId,
    uint256 totalSupply
  ) internal view returns (uint256) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    if (ds.renewalPriceByTokenId[tokenId] > 0)
      return ds.renewalPriceByTokenId[tokenId];

    return _getMembershipPrice(totalSupply);
  }

  // =============================================================
  //                           Allocation
  // =============================================================
  function _verifyFreeAllocation(uint256 newAllocation) internal view {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    // verify newLimit is not more than the allowed platform limit
    if (
      newAllocation >
      IPlatformRequirements(ds.spaceFactory).getMembershipMintLimit()
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
      IPlatformRequirements(MembershipStorage.layout().spaceFactory)
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
  function _getSpaceFactory() public view returns (address) {
    return MembershipStorage.layout().spaceFactory;
  }
}
