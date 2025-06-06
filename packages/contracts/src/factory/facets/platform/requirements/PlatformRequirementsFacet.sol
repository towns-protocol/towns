// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "./IPlatformRequirements.sol";

// libraries

// contracts

import {PlatformRequirementsBase} from "./PlatformRequirementsBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract PlatformRequirementsFacet is
    IPlatformRequirements,
    PlatformRequirementsBase,
    OwnableBase,
    Facet
{
    function __PlatformRequirements_init(
        address feeRecipient,
        uint16 membershipBps,
        uint256 membershipFee,
        uint256 membershipMintLimit,
        uint64 membershipDuration,
        uint256 membershipMinPrice
    ) external onlyInitializing {
        _addInterface(type(IPlatformRequirements).interfaceId);
        _setFeeRecipient(feeRecipient);
        _setMembershipBps(membershipBps);
        _setMembershipFee(membershipFee);
        _setMembershipMintLimit(membershipMintLimit);
        _setMembershipDuration(membershipDuration);
        _setMembershipMinPrice(membershipMinPrice);
    }

    /// @inheritdoc IPlatformRequirements
    function getFeeRecipient() external view returns (address) {
        return _getFeeRecipient();
    }

    /// @inheritdoc IPlatformRequirements
    function getMembershipBps() external view returns (uint16) {
        return _getMembershipBps();
    }

    /// @inheritdoc IPlatformRequirements
    function getMembershipFee() external view returns (uint256) {
        return _getMembershipFee();
    }

    /// @inheritdoc IPlatformRequirements
    function getMembershipMintLimit() external view returns (uint256) {
        return _getMembershipMintLimit();
    }

    /// @inheritdoc IPlatformRequirements
    function getMembershipDuration() external view returns (uint64) {
        return _getMembershipDuration();
    }

    /// @inheritdoc IPlatformRequirements
    function setMembershipMinPrice(uint256 minPrice) external onlyOwner {
        _setMembershipMinPrice(minPrice);
    }

    /// @inheritdoc IPlatformRequirements
    function getMembershipMinPrice() external view returns (uint256) {
        return _getMembershipMinPrice();
    }

    /// @inheritdoc IPlatformRequirements
    function setFeeRecipient(address recipient) external onlyOwner {
        _setFeeRecipient(recipient);
    }

    /// @inheritdoc IPlatformRequirements
    function setMembershipBps(uint16 bps) external onlyOwner {
        _setMembershipBps(bps);
    }

    /// @inheritdoc IPlatformRequirements
    function setMembershipFee(uint256 fee) external onlyOwner {
        _setMembershipFee(fee);
    }

    /// @inheritdoc IPlatformRequirements
    function setMembershipMintLimit(uint256 limit) external onlyOwner {
        _setMembershipMintLimit(limit);
    }

    /// @inheritdoc IPlatformRequirements
    function setMembershipDuration(uint64 duration) external onlyOwner {
        _setMembershipDuration(duration);
    }

    /// @inheritdoc IPlatformRequirements
    function getDenominator() external pure returns (uint256) {
        return _getDenominator();
    }

    /// @inheritdoc IPlatformRequirements
    function getSwapFees() external view returns (uint16 protocolBps, uint16 posterBps) {
        return _getSwapFees();
    }

    /// @inheritdoc IPlatformRequirements
    function setSwapFees(uint16 protocolBps, uint16 posterBps) external onlyOwner {
        _setSwapFees(protocolBps, posterBps);
    }

    /// @inheritdoc IPlatformRequirements
    function isRouterWhitelisted(address router) external view returns (bool) {
        return _isRouterWhitelisted(router);
    }

    /// @inheritdoc IPlatformRequirements
    function setRouterWhitelisted(address router, bool whitelisted) external onlyOwner {
        _setRouterWhitelisted(router, whitelisted);
    }
}
