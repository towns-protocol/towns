// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IReferralsBase} from "./IReferrals.sol";
import {ReferralsStorage} from "./ReferralsStorage.sol";

abstract contract ReferralsBase is IReferralsBase {
    function _registerReferral(Referral memory referral) internal {
        bytes32 referralCode = keccak256(bytes(referral.referralCode));
        ReferralsStorage.Layout storage ds = ReferralsStorage.layout();
        if (ds.referrals[referralCode].recipient != address(0)) {
            revert Referrals__ReferralAlreadyExists();
        }

        _validateReferral(referral);

        ds.referrals[referralCode] = ReferralsStorage.Referral(
            referral.basisPoints,
            referral.recipient
        );

        emit ReferralRegistered(referralCode, referral.basisPoints, referral.recipient);
    }

    function _updateReferral(Referral memory referral) internal {
        _validateReferral(referral);
        bytes32 referralCode = keccak256(bytes(referral.referralCode));
        ReferralsStorage.Layout storage ds = ReferralsStorage.layout();
        if (ds.referrals[referralCode].recipient == address(0)) {
            revert Referrals__InvalidReferralCode();
        }
        ds.referrals[referralCode] = ReferralsStorage.Referral(
            referral.basisPoints,
            referral.recipient
        );
        emit ReferralUpdated(referralCode, referral.basisPoints, referral.recipient);
    }

    function _removeReferral(string memory referralCode) internal {
        bytes32 referralCodeHash = keccak256(bytes(referralCode));
        delete ReferralsStorage.layout().referrals[referralCodeHash];
        emit ReferralRemoved(referralCodeHash);
    }

    function _setMaxBpsFee(uint256 maxBpsFee) internal {
        ReferralsStorage.layout().referralSettings.maxBpsFee = maxBpsFee;
        emit MaxBpsFeeUpdated(maxBpsFee);
    }

    function _setDefaultBpsFee(uint256 defaultBpsFee) internal {
        ReferralsStorage.layout().referralSettings.defaultBpsFee = defaultBpsFee;
        emit DefaultBpsFeeUpdated(defaultBpsFee);
    }

    function _validateReferral(Referral memory referral) internal view {
        if (referral.recipient == address(0)) revert Referrals__InvalidRecipient();
        if (referral.basisPoints == 0) revert Referrals__InvalidBasisPoints();
        if (bytes(referral.referralCode).length == 0) {
            revert Referrals__InvalidReferralCode();
        }
        uint256 maxBpsFee = _maxBpsFee();
        if (maxBpsFee > 0 && referral.basisPoints > maxBpsFee) {
            revert Referrals__InvalidBpsFee();
        }
    }

    function _referralInfo(string memory referralCode) internal view returns (Referral memory) {
        ReferralsStorage.Referral storage storedReferral = ReferralsStorage.layout().referrals[
            keccak256(bytes(referralCode))
        ];
        return Referral(referralCode, storedReferral.bpsFee, storedReferral.recipient);
    }

    function _maxBpsFee() internal view returns (uint256) {
        return ReferralsStorage.layout().referralSettings.maxBpsFee;
    }

    function _defaultBpsFee() internal view returns (uint256) {
        return ReferralsStorage.layout().referralSettings.defaultBpsFee;
    }
}
