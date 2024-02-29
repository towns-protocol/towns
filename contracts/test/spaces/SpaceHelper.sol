// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/spaces/facets/architect/IArchitect.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {ITokenEntitlement} from "contracts/src/spaces/entitlements/token/ITokenEntitlement.sol";
import {IEntitlementRule} from "contracts/src/crosschain/IEntitlementRule.sol";

// libraries

// contracts

abstract contract SpaceHelper {
  function _createUserSpace(
    string memory townId,
    address[] memory users
  ) internal pure returns (IArchitectBase.SpaceInfo memory) {
    return
      IArchitectBase.SpaceInfo({
        id: townId,
        name: "test",
        uri: "ipfs://test",
        membership: IArchitectBase.Membership({
          settings: IMembershipBase.Membership({
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
          requirements: IArchitectBase.MembershipRequirements({
            everyone: false,
            tokens: new ITokenEntitlement.ExternalToken[](0),
            users: users,
            rule: IEntitlementRule(address(0))
          }),
          permissions: new string[](0)
        }),
        channel: IArchitectBase.ChannelInfo({
          id: "test",
          metadata: "ipfs://test"
        })
      });
  }

  function _createSpaceInfo(
    string memory townId
  ) internal pure returns (IArchitectBase.SpaceInfo memory) {
    return
      IArchitectBase.SpaceInfo({
        id: townId,
        name: "test",
        uri: "ipfs://test",
        membership: IArchitectBase.Membership({
          settings: IMembershipBase.Membership({
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
          requirements: IArchitectBase.MembershipRequirements({
            everyone: false,
            tokens: new ITokenEntitlement.ExternalToken[](0),
            users: new address[](0),
            rule: IEntitlementRule(address(0))
          }),
          permissions: new string[](0)
        }),
        channel: IArchitectBase.ChannelInfo({
          id: "test",
          metadata: "ipfs://test"
        })
      });
  }

  function _createEveryoneTownInfo(
    string memory townId
  ) internal pure returns (IArchitectBase.SpaceInfo memory) {
    string[] memory permissions = new string[](2);
    permissions[0] = "Read";
    permissions[1] = "Write";

    return
      IArchitectBase.SpaceInfo({
        id: townId,
        name: "test",
        uri: "ipfs://test",
        membership: IArchitectBase.Membership({
          settings: IMembershipBase.Membership({
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
          requirements: IArchitectBase.MembershipRequirements({
            everyone: true,
            tokens: new ITokenEntitlement.ExternalToken[](0),
            users: new address[](0),
            rule: IEntitlementRule(address(0))
          }),
          permissions: permissions
        }),
        channel: IArchitectBase.ChannelInfo({
          id: "test",
          metadata: "ipfs://test"
        })
      });
  }
}
