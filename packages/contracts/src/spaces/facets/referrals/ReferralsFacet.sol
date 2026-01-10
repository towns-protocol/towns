// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {Permissions} from "src/spaces/facets/Permissions.sol";

// contracts

import {IReferrals} from "./IReferrals.sol";
import {ReferralsBase} from "./ReferralsBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {Entitled} from "src/spaces/facets/Entitled.sol";

contract ReferralsFacet is IReferrals, ReferralsBase, Entitled, Facet {
    function __ReferralsFacet_init() external onlyInitializing {
        _addInterface(type(IReferrals).interfaceId);
    }

    /// @inheritdoc IReferrals
    function registerReferral(Referral memory referral) external {
        _validatePermission(Permissions.ModifySpaceSettings);
        _registerReferral(referral);
    }

    /// @inheritdoc IReferrals
    function updateReferral(Referral memory referral) external {
        _validatePermission(Permissions.ModifySpaceSettings);
        _updateReferral(referral);
    }

    /// @inheritdoc IReferrals
    function removeReferral(string memory referralCode) external {
        _validatePermission(Permissions.ModifySpaceSettings);
        _removeReferral(referralCode);
    }

    /// @inheritdoc IReferrals
    function setMaxBpsFee(uint256 bps) external {
        _validatePermission(Permissions.ModifySpaceSettings);
        _setMaxBpsFee(bps);
    }

    /// @inheritdoc IReferrals
    function setDefaultBpsFee(uint256 bps) external {
        _validatePermission(Permissions.ModifySpaceSettings);
        _setDefaultBpsFee(bps);
    }

    /// @inheritdoc IReferrals
    function referralInfo(string memory referralCode) external view returns (Referral memory) {
        return _referralInfo(referralCode);
    }

    /// @inheritdoc IReferrals
    function maxBpsFee() external view returns (uint256) {
        return _maxBpsFee();
    }

    /// @inheritdoc IReferrals
    function defaultBpsFee() external view returns (uint256) {
        return _defaultBpsFee();
    }
}
