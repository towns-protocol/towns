// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeeManager} from "../../../factory/facets/fee/IFeeManager.sol";
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IPricingModules} from "../../../factory/facets/architect/pricing/IPricingModules.sol";
import {IMembershipBase} from "./IMembership.sol";
import {IMembershipPricing} from "./pricing/IMembershipPricing.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {FeeTypesLib} from "../../../factory/facets/fee/FeeTypesLib.sol";
import {FeeConfig} from "../../../factory/facets/fee/FeeManagerStorage.sol";
import {MembershipStorage} from "./MembershipStorage.sol";

abstract contract MembershipBase is IMembershipBase {
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    function __MembershipBase_init(Membership memory info, address spaceFactory) internal {
        MembershipStorage.Layout storage $ = MembershipStorage.layout();

        $.spaceFactory = spaceFactory;
        $.pricingModule = info.pricingModule;
        _setMembershipCurrency(info.currency);
        $.membershipMaxSupply = info.maxSupply;

        if (info.freeAllocation > 0) {
            _verifyFreeAllocation(info.freeAllocation);
            $.freeAllocation = info.freeAllocation;
        }

        $.freeAllocationEnabled = true;

        if (info.price > 0) {
            if (info.freeAllocation > 0)
                Membership__CannotSetFreeAllocationOnPaidSpace.selector.revertWith();
            IMembershipPricing(info.pricingModule).setPrice(info.price);
        }

        if (info.duration > 0) {
            _verifyDuration(info.duration);
            $.membershipDuration = info.duration;
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         MEMBERSHIP                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getMembershipPrice(
        uint256 totalSupply
    ) internal view virtual returns (uint256 membershipPrice) {
        address pricingModule = _getPricingModule();
        if (pricingModule == address(0)) return 0;
        uint256 freeAllocation = _getMembershipFreeAllocation();
        membershipPrice = IMembershipPricing(pricingModule).getPrice(freeAllocation, totalSupply);
    }

    function _getProtocolFee(uint256 membershipPrice) internal view returns (uint256) {
        bytes32 feeType = _getMembershipFeeType(_getMembershipCurrency());
        return
            IFeeManager(_getSpaceFactory()).calculateFee(feeType, address(0), membershipPrice, "");
    }

    /// @notice Returns the fee type for the membership currency
    /// @dev Uses dynamic fee type for non-native currencies
    function _getMembershipFeeType(address currency) internal pure returns (bytes32) {
        if (currency == CurrencyTransfer.NATIVE_TOKEN) return FeeTypesLib.MEMBERSHIP;
        return FeeTypesLib.membership(currency);
    }

    function _getTotalMembershipPayment(
        uint256 membershipPrice
    ) internal view returns (uint256 totalRequired, uint256 protocolFee) {
        protocolFee = _getProtocolFee(membershipPrice);
        totalRequired = membershipPrice + protocolFee;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          DURATION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyDuration(uint64 duration) internal view {
        uint256 maxDuration = _getPlatformRequirements().getMembershipDuration();

        if (duration == 0) Membership__InvalidDuration.selector.revertWith();

        if (duration > maxDuration) Membership__InvalidDuration.selector.revertWith();
    }

    function _getMembershipDuration() internal view returns (uint64 duration) {
        duration = MembershipStorage.layout().membershipDuration;

        if (duration == 0) duration = _getPlatformRequirements().getMembershipDuration();
    }

    function _setMembershipDuration(uint64 duration) internal {
        _verifyDuration(duration);
        MembershipStorage.layout().membershipDuration = duration;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       PRICING MODULE                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyPricingModule(address pricingModule) internal view {
        if (pricingModule == address(0)) Membership__InvalidPricingModule.selector.revertWith();

        if (!IPricingModules(_getSpaceFactory()).isPricingModule(pricingModule)) {
            Membership__InvalidPricingModule.selector.revertWith();
        }
    }

    function _setPricingModule(address newPricingModule) internal {
        MembershipStorage.layout().pricingModule = newPricingModule;
    }

    function _getPricingModule() internal view returns (address) {
        return MembershipStorage.layout().pricingModule;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           RENEWAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _setMembershipRenewalPrice(uint256 tokenId, uint256 pricePaid) internal {
        MembershipStorage.layout().renewalPriceByTokenId[tokenId] = pricePaid;
    }

    function _getMembershipRenewalPrice(
        uint256 tokenId,
        uint256 totalSupply
    ) internal view returns (uint256) {
        MembershipStorage.Layout storage $ = MembershipStorage.layout();
        uint256 lockedRenewalPrice = $.renewalPriceByTokenId[tokenId];
        uint256 currentPrice = _getMembershipPrice(totalSupply);

        // If no locked price, use current price
        if (lockedRenewalPrice == 0) return currentPrice;

        // Return the lower of the two prices (benefits user)
        return FixedPointMathLib.min(lockedRenewalPrice, currentPrice);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ALLOCATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyFreeAllocation(uint256 newAllocation) internal view {
        // verify newLimit is not more than the allowed platform limit
        if (newAllocation > _getPlatformRequirements().getMembershipMintLimit()) {
            Membership__InvalidFreeAllocation.selector.revertWith();
        }
    }

    function _setMembershipFreeAllocation(uint256 newAllocation) internal {
        MembershipStorage.Layout storage $ = MembershipStorage.layout();
        ($.freeAllocation, $.freeAllocationEnabled) = (newAllocation, true);
    }

    function _getMembershipFreeAllocation() internal view returns (uint256) {
        MembershipStorage.Layout storage $ = MembershipStorage.layout();

        if ($.freeAllocationEnabled) return $.freeAllocation;

        return _getPlatformRequirements().getMembershipMintLimit();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        SUPPLY LIMIT                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyMaxSupply(uint256 newLimit, uint256 totalSupply) internal pure {
        // if the new limit is less than the current total supply, revert
        if (newLimit < totalSupply) Membership__InvalidMaxSupply.selector.revertWith();
    }

    function _setMembershipSupplyLimit(uint256 newLimit) internal {
        MembershipStorage.layout().membershipMaxSupply = newLimit;
    }

    function _getMembershipSupplyLimit() internal view returns (uint256) {
        return MembershipStorage.layout().membershipMaxSupply;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          CURRENCY                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _setMembershipCurrency(address currency) internal {
        // Validate fee type is configured (skip for native token - always supported)
        if (!(currency == address(0) || currency == CurrencyTransfer.NATIVE_TOKEN)) {
            bytes32 feeType = FeeTypesLib.membership(currency);
            FeeConfig memory config = IFeeManager(_getSpaceFactory()).getFeeConfig(feeType);
            if (!config.enabled) Membership__UnsupportedCurrency.selector.revertWith();
        }
        MembershipStorage.layout().membershipCurrency = currency;
    }

    function _getMembershipCurrency() internal view returns (address currency) {
        currency = MembershipStorage.layout().membershipCurrency;
        // Normalize address(0) to NATIVE_TOKEN for backwards compatibility
        if (currency == address(0)) currency = CurrencyTransfer.NATIVE_TOKEN;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           FACTORY                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getSpaceFactory() internal view returns (address) {
        return MembershipStorage.layout().spaceFactory;
    }

    function _getPlatformRequirements() internal view returns (IPlatformRequirements) {
        return IPlatformRequirements(_getSpaceFactory());
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            IMAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getMembershipImage() internal view returns (string memory) {
        return MembershipStorage.layout().membershipImage;
    }

    function _setMembershipImage(string memory image) internal {
        MembershipStorage.layout().membershipImage = image;
    }
}
