// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ITownArchitectBase} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";
import {IEntitlementRule} from "contracts/src/crosschain/IEntitlementRule.sol";

// libraries

// contracts

abstract contract TownHelper {
  function _createUserTown(
    string memory townId,
    address[] memory users
  ) internal pure returns (ITownArchitectBase.TownInfo memory) {
    return
      ITownArchitectBase.TownInfo({
        id: townId,
        name: "test",
        uri: "ipfs://test",
        membership: ITownArchitectBase.Membership({
          settings: IMembershipBase.MembershipInfo({
            name: "Member",
            symbol: "MEM",
            price: 0,
            maxSupply: 0,
            duration: 0,
            currency: address(0),
            feeRecipient: address(0),
            freeAllocation: 0,
            pricingModule: address(0)
          }),
          requirements: ITownArchitectBase.MembershipRequirements({
            everyone: false,
            tokens: new ITokenEntitlement.ExternalToken[](0),
            users: users,
            rule: IEntitlementRule(address(0))
          }),
          permissions: new string[](0)
        }),
        channel: ITownArchitectBase.ChannelInfo({
          id: "test",
          metadata: "ipfs://test"
        })
      });
  }

  function _createTownInfo(
    string memory townId
  ) internal pure returns (ITownArchitectBase.TownInfo memory) {
    return
      ITownArchitectBase.TownInfo({
        id: townId,
        name: "test",
        uri: "ipfs://test",
        membership: ITownArchitectBase.Membership({
          settings: IMembershipBase.MembershipInfo({
            name: "Member",
            symbol: "MEM",
            price: 0,
            maxSupply: 0,
            duration: 0,
            currency: address(0),
            feeRecipient: address(0),
            freeAllocation: 0,
            pricingModule: address(0)
          }),
          requirements: ITownArchitectBase.MembershipRequirements({
            everyone: false,
            tokens: new ITokenEntitlement.ExternalToken[](0),
            users: new address[](0),
            rule: IEntitlementRule(address(0))
          }),
          permissions: new string[](0)
        }),
        channel: ITownArchitectBase.ChannelInfo({
          id: "test",
          metadata: "ipfs://test"
        })
      });
  }

  function _createEveryoneTownInfo(
    string memory townId
  ) internal pure returns (ITownArchitectBase.TownInfo memory) {
    string[] memory permissions = new string[](2);
    permissions[0] = "Read";
    permissions[1] = "Write";

    return
      ITownArchitectBase.TownInfo({
        id: townId,
        name: "test",
        uri: "ipfs://test",
        membership: ITownArchitectBase.Membership({
          settings: IMembershipBase.MembershipInfo({
            name: "Member",
            symbol: "MEM",
            price: 0,
            maxSupply: 0,
            duration: 0,
            currency: address(0),
            feeRecipient: address(0),
            freeAllocation: 0,
            pricingModule: address(0)
          }),
          requirements: ITownArchitectBase.MembershipRequirements({
            everyone: true,
            tokens: new ITokenEntitlement.ExternalToken[](0),
            users: new address[](0),
            rule: IEntitlementRule(address(0))
          }),
          permissions: permissions
        }),
        channel: ITownArchitectBase.ChannelInfo({
          id: "test",
          metadata: "ipfs://test"
        })
      });
  }
}
