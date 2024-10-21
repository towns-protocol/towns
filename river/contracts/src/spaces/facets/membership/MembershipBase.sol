// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IMembershipBase} from "./IMembership.sol";
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IMembershipPricing} from "./pricing/IMembershipPricing.sol";
import {IPricingModules} from "contracts/src/factory/facets/architect/pricing/IPricingModules.sol";

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";
import {MembershipStorage} from "./MembershipStorage.sol";

// contracts
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

abstract contract MembershipBase is IMembershipBase {
  function __MembershipBase_init(
    Membership memory info,
    address spaceFactory
  ) internal {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    ds.spaceFactory = spaceFactory;
    ds.pricingModule = info.pricingModule;
    ds.membershipCurrency = CurrencyTransfer.NATIVE_TOKEN;
    ds.membershipMaxSupply = info.maxSupply;

    if (info.freeAllocation > 0) {
      _verifyFreeAllocation(info.freeAllocation);
      ds.freeAllocation = info.freeAllocation;
    } else {
      ds.freeAllocation = IPlatformRequirements(ds.spaceFactory)
        .getMembershipMintLimit();
    }

    ds.freeAllocationEnabled = true;

    if (info.price > 0) {
      _verifyPrice(info.price);
      IMembershipPricing(ds.pricingModule).setPrice(info.price);
    }
  }

  // =============================================================
  //                           Membership
  // =============================================================

  function _collectProtocolFee(
    address buyer,
    uint256 membershipPrice
  ) internal returns (uint256 protocolFee) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();
    IPlatformRequirements platform = IPlatformRequirements(ds.spaceFactory);

    address currency = ds.membershipCurrency;
    address platformRecipient = platform.getFeeRecipient();
    protocolFee = _getProtocolFee(membershipPrice);

    //transfer the platform fee to the platform fee recipient
    CurrencyTransfer.transferCurrency(
      currency,
      buyer, // from
      platformRecipient, // to
      protocolFee
    );
  }

  function _getProtocolFee(
    uint256 membershipPrice
  ) internal view returns (uint256) {
    IPlatformRequirements platform = IPlatformRequirements(_getSpaceFactory());

    uint256 minPrice = platform.getMembershipMinPrice();
    uint256 fixedFee = platform.getMembershipFee();

    if (membershipPrice < minPrice) return fixedFee;

    return BasisPoints.calculate(membershipPrice, platform.getMembershipBps());
  }

  function _transferIn(
    address from,
    uint256 amount
  ) internal returns (uint256) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    // get the currency being used for membership
    address currency = _getMembershipCurrency();

    if (currency == CurrencyTransfer.NATIVE_TOKEN) {
      ds.tokenBalance += amount;
      return amount;
    }

    // handle erc20 tokens
    IERC20 token = IERC20(currency);
    uint256 balanceBefore = token.balanceOf(address(this));
    CurrencyTransfer.transferCurrency(currency, from, address(this), amount);
    uint256 balanceAfter = token.balanceOf(address(this));

    // Calculate the amount of tokens transferred
    uint256 finalAmount = balanceAfter - balanceBefore;
    if (finalAmount != amount) revert Membership__InsufficientPayment();

    ds.tokenBalance += finalAmount;
    return finalAmount;
  }

  function _getCreatorBalance() internal view returns (uint256) {
    return MembershipStorage.layout().tokenBalance;
  }

  // =============================================================
  //                           Duration
  // =============================================================
  function _getMembershipDuration() internal view returns (uint64) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();
    return IPlatformRequirements(ds.spaceFactory).getMembershipDuration();
  }

  // =============================================================
  //                        Pricing Module
  // =============================================================
  function _verifyPricingModule(address pricingModule) internal view {
    if (pricingModule == address(0)) revert Membership__InvalidPricingModule();

    if (!IPricingModules(_getSpaceFactory()).isPricingModule(pricingModule))
      revert Membership__InvalidPricingModule();
  }

  function _setPricingModule(address newPricingModule) internal {
    MembershipStorage.layout().pricingModule = newPricingModule;
  }

  function _getPricingModule() internal view returns (address) {
    return MembershipStorage.layout().pricingModule;
  }

  // =============================================================
  //                           Pricing
  // =============================================================
  function _verifyPrice(uint256 newPrice) internal view {
    uint256 minFee = IPlatformRequirements(_getSpaceFactory())
      .getMembershipFee();
    if (newPrice < minFee) revert Membership__PriceTooLow();
  }

  /// @dev Makes it virtual to allow other pricing strategies
  function _getMembershipPrice(
    uint256 totalSupply
  ) internal view virtual returns (uint256) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    // get free allocation
    uint256 freeAllocation = _getMembershipFreeAllocation();

    if (ds.pricingModule != address(0))
      return
        IMembershipPricing(ds.pricingModule).getPrice(
          freeAllocation,
          totalSupply
        );

    return IPlatformRequirements(ds.spaceFactory).getMembershipMinPrice();
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

  function _setMembershipFreeAllocation(uint256 newAllocation) internal {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();
    ds.freeAllocation = newAllocation;
    ds.freeAllocationEnabled = true;
    emit MembershipFreeAllocationUpdated(newAllocation);
  }

  function _getMembershipFreeAllocation() internal view returns (uint256) {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    if (ds.freeAllocationEnabled) return ds.freeAllocation;

    return IPlatformRequirements(ds.spaceFactory).getMembershipMintLimit();
  }

  // =============================================================
  //                   Token Max Supply Limits
  // =============================================================
  function _verifyMaxSupply(
    uint256 newLimit,
    uint256 totalSupply
  ) internal pure {
    // if the new limit is less than the current total supply, revert
    if (newLimit < totalSupply) revert Membership__InvalidMaxSupply();
  }

  function _setMembershipSupplyLimit(uint256 newLimit) internal {
    MembershipStorage.layout().membershipMaxSupply = newLimit;
  }

  function _getMembershipSupplyLimit() internal view returns (uint256) {
    return MembershipStorage.layout().membershipMaxSupply;
  }

  // =============================================================
  //                           Currency
  // =============================================================
  function _getMembershipCurrency() internal view returns (address) {
    return MembershipStorage.layout().membershipCurrency;
  }

  // =============================================================
  //                           Factory
  // =============================================================
  function _getSpaceFactory() internal view returns (address) {
    return MembershipStorage.layout().spaceFactory;
  }

  // =============================================================
  //                           Image
  // =============================================================
  function _getMembershipImage() internal view returns (string memory) {
    return MembershipStorage.layout().membershipImage;
  }

  function _setMembershipImage(string memory image) internal {
    MembershipStorage.layout().membershipImage = image;
  }
}
