// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// libraries
import {RuleEntitlementUtil} from "contracts/test/crosschain/RuleEntitlementUtil.sol";

// contracts

abstract contract SpaceHelper {
  function _createUserSpaceInfo(
    string memory spaceId,
    address[] memory users
  ) internal pure returns (IArchitectBase.SpaceInfo memory info) {
    info = _createSpaceInfo(spaceId);
    info.membership.requirements.users = users;
    info.membership.requirements.ruleData = abi.encode(
      RuleEntitlementUtil.getMockERC721RuleData()
    );
  }

  function _createSpaceInfo(
    string memory spaceId
  ) internal pure returns (IArchitectBase.SpaceInfo memory) {
    return
      IArchitectBase.SpaceInfo({
        name: spaceId,
        uri: "ipfs://test",
        shortDescription: "short description",
        longDescription: "long description",
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
            ruleData: abi.encode(RuleEntitlementUtil.getNoopRuleData())
          }),
          permissions: new string[](0)
        }),
        channel: IArchitectBase.ChannelInfo({metadata: "ipfs://test"})
      });
  }

  function _createEveryoneSpaceInfo(
    string memory spaceId
  ) internal pure returns (IArchitectBase.SpaceInfo memory info) {
    info = _createSpaceInfo(spaceId);
    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;

    info.membership.requirements.everyone = true;
    info.membership.permissions = permissions;
  }

  function _createGatedSpaceInfo(
    string memory townId
  ) internal pure returns (IArchitectBase.SpaceInfo memory info) {
    info = _createSpaceInfo(townId);
    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;

    info.membership.requirements.ruleData = abi.encode(
      RuleEntitlementUtil.getMockERC721RuleData()
    );
    info.membership.permissions = permissions;
  }
}
