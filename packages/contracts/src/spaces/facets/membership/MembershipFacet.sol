// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembership} from "./IMembership.sol";
import {IMembershipPricing} from "./pricing/IMembershipPricing.sol";

// libraries
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {MembershipJoin} from "./join/MembershipJoin.sol";

contract MembershipFacet is IMembership, MembershipJoin, ReentrancyGuard, Facet {
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            JOIN                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function joinSpace(JoinType action, bytes calldata data) external payable nonReentrant {
        if (action == JoinType.Basic) {
            address receiver = abi.decode(data, (address));
            _joinSpace(receiver);
        } else if (action == JoinType.WithReferral) {
            (address receiver, ReferralTypes memory referral) = abi.decode(
                data,
                (address, ReferralTypes)
            );
            _joinSpaceWithReferral(receiver, referral);
        } else {
            Membership__InvalidAction.selector.revertWith();
        }
    }

    /// @inheritdoc IMembership
    function joinSpace(address receiver) external payable nonReentrant {
        _joinSpace(receiver);
    }

    /// @inheritdoc IMembership
    function joinSpaceWithReferral(
        address receiver,
        ReferralTypes memory referral
    ) external payable nonReentrant {
        _joinSpaceWithReferral(receiver, referral);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           RENEWAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function renewMembership(uint256 tokenId) external payable nonReentrant {
        _renewMembership(msg.sender, tokenId);
    }

    /// @inheritdoc IMembership
    function expiresAt(uint256 tokenId) external view returns (uint256) {
        return _expiresAt(tokenId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          DURATION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function setMembershipDuration(uint64 duration) external onlyOwner {
        _setMembershipDuration(duration);
    }

    /// @inheritdoc IMembership
    function getMembershipDuration() external view returns (uint64) {
        return _getMembershipDuration();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       PRICING MODULE                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function setMembershipPricingModule(address pricingModule) external onlyOwner {
        _verifyPricingModule(pricingModule);
        _setPricingModule(pricingModule);
    }

    /// @inheritdoc IMembership
    function getMembershipPricingModule() external view returns (address) {
        return _getPricingModule();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           PRICING                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function setMembershipPrice(uint256 newPrice) external onlyOwner {
        IMembershipPricing(_getPricingModule()).setPrice(newPrice);
    }

    /// @inheritdoc IMembership
    function getMembershipPrice() external view returns (uint256 totalRequired) {
        uint256 membershipPrice = _getMembershipPrice(_totalSupply());
        if (membershipPrice == 0) return 0;

        (totalRequired, ) = _getTotalMembershipPayment(membershipPrice);
    }

    /// @inheritdoc IMembership
    function getMembershipRenewalPrice(
        uint256 tokenId
    ) external view returns (uint256 totalRequired) {
        uint256 renewalPrice = _getMembershipRenewalPrice(tokenId, _totalSupply());
        if (renewalPrice == 0) return 0;
        (totalRequired, ) = _getTotalMembershipPayment(renewalPrice);
    }

    /// @inheritdoc IMembership
    function getProtocolFee() external view returns (uint256 protocolFee) {
        uint256 membershipPrice = _getMembershipPrice(_totalSupply());
        if (membershipPrice == 0) return 0;
        (, protocolFee) = _getTotalMembershipPayment(membershipPrice);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ALLOCATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function setMembershipFreeAllocation(uint256 newAllocation) external onlyOwner {
        // get current supply limit
        uint256 currentSupplyLimit = _getMembershipSupplyLimit();

        // verify newLimit is not more than the max supply limit
        if (currentSupplyLimit != 0 && newAllocation > currentSupplyLimit) {
            Membership__InvalidFreeAllocation.selector.revertWith();
        }

        _verifyFreeAllocation(newAllocation);
        _setMembershipFreeAllocation(newAllocation);
        emit MembershipFreeAllocationUpdated(newAllocation);
    }

    /// @inheritdoc IMembership
    function getMembershipFreeAllocation() external view returns (uint256) {
        return _getMembershipFreeAllocation();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        SUPPLY LIMIT                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function setMembershipLimit(uint256 newLimit) external onlyOwner {
        _verifyMaxSupply(newLimit, _totalSupply());
        _setMembershipSupplyLimit(newLimit);
    }

    /// @inheritdoc IMembership
    function getMembershipLimit() external view returns (uint256) {
        return _getMembershipSupplyLimit();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            IMAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function setMembershipImage(string calldata newImage) external onlyOwner {
        _setMembershipImage(newImage);
    }

    /// @inheritdoc IMembership
    function getMembershipImage() external view returns (string memory) {
        return _getMembershipImage();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          CURRENCY                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function setMembershipCurrency(address currency) external onlyOwner {
        _setMembershipCurrency(currency);
        emit MembershipCurrencyUpdated(currency);
    }

    /// @inheritdoc IMembership
    function getMembershipCurrency() external view returns (address) {
        return _getMembershipCurrency();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembership
    function getSpaceFactory() external view returns (address) {
        return _getSpaceFactory();
    }

    /// @inheritdoc IMembership
    function revenue() external view returns (uint256) {
        address currency = _getMembershipCurrency();
        if (currency != CurrencyTransfer.NATIVE_TOKEN) {
            return currency.balanceOf(address(this));
        }
        return address(this).balance;
    }
}
