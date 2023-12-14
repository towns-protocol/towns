// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IMembershipReferral} from "./IMembershipReferral.sol";

// libraries

// contracts
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {MembershipReferralBase} from "./MembershipReferralBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract MembershipReferralFacet is
  IMembershipReferral,
  TokenOwnableBase,
  MembershipReferralBase,
  Facet
{
  function __MembershipReferralFacet_init() external onlyInitializing {
    __MembershipReferralBase_init();
  }

  /// @inheritdoc IMembershipReferral
  function createReferralCode(uint256 code, uint16 bps) external onlyOwner {
    _createReferralCode(code, bps);
  }

  /// @inheritdoc IMembershipReferral
  function removeReferralCode(uint256 code) external onlyOwner {
    _removeReferralCode(code);
  }

  /// @inheritdoc IMembershipReferral
  function referralCodeBps(uint256 code) external view returns (uint16) {
    return _referralCodeBps(code);
  }
}
