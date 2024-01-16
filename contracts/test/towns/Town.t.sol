// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {ITownArchitectBase} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";
import {IEntitlementRule} from "contracts/src/crosschain/IEntitlementRule.sol";

// libraries

// contracts
import {OwnablePendingHelper} from "contracts/test/diamond/ownable/pending/OwnablePendingSetup.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";
import {RolesHelper} from "contracts/test/towns/roles/RolesSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsSetup.sol";
import {TokenPausableHelper} from "contracts/test/diamond/pausable/token/TokenPausableSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {MembershipHelper} from "contracts/test/towns/membership/MembershipSetup.sol";
import {MembershipReferralHelper} from "contracts/test/towns/membership/MembershipReferralSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {BanningHelper} from "contracts/test/towns/banning/BanningHelper.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

/**
 * @title TownImplementation
 * @notice Helper contract to create an implementation of a Town
 * @dev This contract is used for testing purposes only
 */
contract TownImplementation {
  TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
  OwnablePendingHelper ownableHelper = new OwnablePendingHelper();
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
  RolesHelper rolesHelper = new RolesHelper();
  ChannelsHelper channelsHelper = new ChannelsHelper();
  TokenPausableHelper tokenPausableHelper = new TokenPausableHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  MembershipHelper membershipHelper = new MembershipHelper();
  MembershipReferralHelper membershipReferralHelper =
    new MembershipReferralHelper();
  BanningHelper banningHelper = new BanningHelper();

  MultiInit internal multiInit = new MultiInit();

  uint256 initDataCount = 4;
  uint256 index;

  address[] initAddresses = new address[](initDataCount);
  bytes[] initDatas = new bytes[](initDataCount);

  function diamondInitParams(
    address owner
  ) external returns (Diamond.InitParams memory) {
    membershipHelper.addSelectors(erc721aHelper.selectors());

    Diamond.FacetCut[] memory cuts = new Diamond.FacetCut[](11);

    cuts[index++] = tokenOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = diamondCutHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = diamondLoupeHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = entitlementsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = rolesHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = tokenPausableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = channelsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = membershipHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = membershipReferralHelper.makeCut(
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = banningHelper.makeCut(IDiamond.FacetCutAction.Add);

    index = 0;

    initAddresses[index++] = ownableHelper.facet();
    initAddresses[index++] = diamondCutHelper.facet();
    initAddresses[index++] = diamondLoupeHelper.facet();
    initAddresses[index++] = introspectionHelper.facet();

    index = 0;

    initDatas[index++] = ownableHelper.makeInitData(owner);
    initDatas[index++] = diamondCutHelper.makeInitData("");
    initDatas[index++] = diamondLoupeHelper.makeInitData("");
    initDatas[index++] = introspectionHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          multiInit.multiInit.selector,
          initAddresses,
          initDatas
        )
      });
  }
}

abstract contract TownHelper {
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
