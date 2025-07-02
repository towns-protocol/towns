// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IPricingModules} from "../../../factory/facets/architect/pricing/IPricingModules.sol";
import {IMembershipBase} from "./IMembership.sol";
import {IMembershipPricing} from "./pricing/IMembershipPricing.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {MembershipStorage} from "./MembershipStorage.sol";

abstract contract MembershipBase is IMembershipBase {
    using SafeTransferLib for address;

    function __MembershipBase_init(Membership memory info, address spaceFactory) internal {
        MembershipStorage.Layout storage ds = MembershipStorage.layout();

        ds.spaceFactory = spaceFactory;
        ds.pricingModule = info.pricingModule;
        ds.membershipCurrency = CurrencyTransfer.NATIVE_TOKEN;
        ds.membershipMaxSupply = info.maxSupply;

        if (info.freeAllocation > 0) {
            _verifyFreeAllocation(info.freeAllocation);
            ds.freeAllocation = info.freeAllocation;
        }

        ds.freeAllocationEnabled = true;

        if (info.price > 0) {
            _verifyPrice(info.price);
            IMembershipPricing(info.pricingModule).setPrice(info.price);
        }

        if (info.duration > 0) {
            _verifyDuration(info.duration);
            ds.membershipDuration = info.duration;
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         MEMBERSHIP                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _collectProtocolFee(
        address payer,
        uint256 membershipPrice
    ) internal returns (uint256 protocolFee) {
        protocolFee = _getProtocolFee(membershipPrice);

        // transfer the platform fee to the platform fee recipient
        CurrencyTransfer.transferCurrency(
            _getMembershipCurrency(),
            payer, // from
            _getPlatformRequirements().getFeeRecipient(), // to
            protocolFee
        );
    }

    function _getProtocolFee(uint256 membershipPrice) internal view returns (uint256) {
        IPlatformRequirements platform = _getPlatformRequirements();

        uint256 minPrice = platform.getMembershipMinPrice();

        if (membershipPrice < minPrice) return platform.getMembershipFee();

        return BasisPoints.calculate(membershipPrice, platform.getMembershipBps());
    }

    function _transferIn(address from, uint256 amount) internal returns (uint256) {
        MembershipStorage.Layout storage ds = MembershipStorage.layout();

        // get the currency being used for membership
        address currency = _getMembershipCurrency();

        if (currency == CurrencyTransfer.NATIVE_TOKEN) {
            ds.tokenBalance += amount;
            return amount;
        }

        // handle erc20 tokens
        uint256 balanceBefore = currency.balanceOf(address(this));
        CurrencyTransfer.transferCurrency(currency, from, address(this), amount);
        uint256 balanceAfter = currency.balanceOf(address(this));

        // Calculate the amount of tokens transferred
        uint256 finalAmount = balanceAfter - balanceBefore;
        if (finalAmount != amount) {
            CustomRevert.revertWith(Membership__InsufficientPayment.selector);
        }

        ds.tokenBalance += finalAmount;
        return finalAmount;
    }

    function _getCreatorBalance() internal view returns (uint256) {
        return MembershipStorage.layout().tokenBalance;
    }

    function _setCreatorBalance(uint256 newBalance) internal {
        MembershipStorage.layout().tokenBalance = newBalance;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          DURATION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyDuration(uint64 duration) internal view {
        uint256 maxDuration = _getPlatformRequirements().getMembershipDuration();

        if (duration == 0) {
            CustomRevert.revertWith(Membership__InvalidDuration.selector);
        }

        if (duration > maxDuration) {
            CustomRevert.revertWith(Membership__InvalidDuration.selector);
        }
    }

    function _getMembershipDuration() internal view returns (uint64 duration) {
        duration = MembershipStorage.layout().membershipDuration;

        if (duration == 0) {
            duration = _getPlatformRequirements().getMembershipDuration();
        }
    }

    function _setMembershipDuration(uint64 duration) internal {
        _verifyDuration(duration);
        MembershipStorage.layout().membershipDuration = duration;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       PRICING MODULE                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyPricingModule(address pricingModule) internal view {
        if (pricingModule == address(0)) {
            CustomRevert.revertWith(Membership__InvalidPricingModule.selector);
        }

        if (!IPricingModules(_getSpaceFactory()).isPricingModule(pricingModule)) {
            CustomRevert.revertWith(Membership__InvalidPricingModule.selector);
        }
    }

    function _setPricingModule(address newPricingModule) internal {
        MembershipStorage.layout().pricingModule = newPricingModule;
    }

    function _getPricingModule() internal view returns (address) {
        return MembershipStorage.layout().pricingModule;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           PRICING                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyPrice(uint256 newPrice) internal view {
        uint256 minFee = _getPlatformRequirements().getMembershipFee();
        if (newPrice < minFee) {
            CustomRevert.revertWith(Membership__PriceTooLow.selector);
        }
    }

    /// @dev Makes it virtual to allow other pricing strategies
    function _getMembershipPrice(
        uint256 totalSupply
    ) internal view virtual returns (uint256 membershipPrice) {
        // get free allocation
        uint256 freeAllocation = _getMembershipFreeAllocation();
        address pricingModule = _getPricingModule();

        IPlatformRequirements platform = _getPlatformRequirements();

        if (pricingModule == address(0)) return platform.getMembershipFee();

        membershipPrice = IMembershipPricing(pricingModule).getPrice(freeAllocation, totalSupply);
        uint256 minPrice = platform.getMembershipMinPrice();
        if (membershipPrice < minPrice) return platform.getMembershipFee();
    }

    function _setMembershipRenewalPrice(uint256 tokenId, uint256 pricePaid) internal {
        MembershipStorage.layout().renewalPriceByTokenId[tokenId] = pricePaid;
    }

    function _getMembershipRenewalPrice(
        uint256 tokenId,
        uint256 totalSupply
    ) internal view returns (uint256) {
        MembershipStorage.Layout storage ds = MembershipStorage.layout();
        IPlatformRequirements platform = _getPlatformRequirements();

        uint256 minFee = platform.getMembershipFee();
        uint256 renewalPrice = ds.renewalPriceByTokenId[tokenId];

        if (renewalPrice != 0) {
            return FixedPointMathLib.max(renewalPrice, minFee);
        }

        uint256 price = _getMembershipPrice(totalSupply);
        return FixedPointMathLib.max(price, minFee);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ALLOCATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyFreeAllocation(uint256 newAllocation) internal view {
        // verify newLimit is not more than the allowed platform limit
        if (newAllocation > _getPlatformRequirements().getMembershipMintLimit()) {
            CustomRevert.revertWith(Membership__InvalidFreeAllocation.selector);
        }
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

        return _getPlatformRequirements().getMembershipMintLimit();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        SUPPLY LIMIT                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _verifyMaxSupply(uint256 newLimit, uint256 totalSupply) internal pure {
        // if the new limit is less than the current total supply, revert
        if (newLimit < totalSupply) {
            CustomRevert.revertWith(Membership__InvalidMaxSupply.selector);
        }
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

    function _getMembershipCurrency() internal view returns (address) {
        return MembershipStorage.layout().membershipCurrency;
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
