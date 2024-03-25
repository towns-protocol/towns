// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/spaces/facets/architect/IArchitect.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {RuleEntitlementUtil} from "contracts/src/crosschain/RuleEntitlementUtil.sol";

// libraries

// contracts

abstract contract SpaceHelper {
  function _createUserSpaceInfo(
    string memory spaceId,
    address[] memory users
  ) internal pure returns (IArchitectBase.SpaceInfo memory) {
    return
      IArchitectBase.SpaceInfo({
        name: spaceId,
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
            users: users,
            ruleData: RuleEntitlementUtil.getNoopRuleData()
          }),
          permissions: new string[](0)
        }),
        channel: IArchitectBase.ChannelInfo({metadata: "ipfs://test"})
      });
  }

  function _createSpaceInfo(
    string memory spaceId
  ) internal pure returns (IArchitectBase.SpaceInfo memory) {
    return
      IArchitectBase.SpaceInfo({
        name: spaceId,
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
            users: new address[](0),
            ruleData: RuleEntitlementUtil.getNoopRuleData()
          }),
          permissions: new string[](0)
        }),
        channel: IArchitectBase.ChannelInfo({metadata: "ipfs://test"})
      });
  }

  function _createEveryoneSpaceInfo(
    string memory spaceId
  ) internal pure returns (IArchitectBase.SpaceInfo memory) {
    string[] memory permissions = new string[](2);
    permissions[0] = "Read";
    permissions[1] = "Write";

    return
      IArchitectBase.SpaceInfo({
        name: spaceId,
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
            users: new address[](0),
            ruleData: RuleEntitlementUtil.getNoopRuleData()
          }),
          permissions: permissions
        }),
        channel: IArchitectBase.ChannelInfo({metadata: "ipfs://test"})
      });
  }

  function _createGatedSpaceInfo(
    string memory townId
  ) internal pure returns (IArchitectBase.SpaceInfo memory) {
    string[] memory permissions = new string[](2);
    permissions[0] = "Read";
    permissions[1] = "Write";

    return
      IArchitectBase.SpaceInfo({
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
            users: new address[](0),
            ruleData: RuleEntitlementUtil.getMockERC721RuleData()
          }),
          permissions: permissions
        }),
        channel: IArchitectBase.ChannelInfo({metadata: "ipfs://test"})
      });
  }
}
