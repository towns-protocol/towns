// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IChannelBase} from "contracts/src/towns/facets/channels/IChannel.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {EntitlementsManager} from "contracts/src/towns/facets/entitlements/EntitlementsManager.sol";
import {TokenOwnableFacet} from "contracts/src/diamond/facets/ownable/token/TokenOwnableFacet.sol";
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";
import {MembershipReferralFacet} from "contracts/src/towns/facets/membership/referral/MembershipReferralFacet.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract InteractTown is Interaction, IChannelBase {
  function __interact(uint256, address) public view override {
    address town = 0xEE58aE5becB51146Ae8f4fb34FbfCc5E5657e721;

    MembershipReferralFacet membershipReferralFacet = MembershipReferralFacet(
      town
    );

    console.log("feeBps", membershipReferralFacet.referralCodeBps(0));
  }
}
