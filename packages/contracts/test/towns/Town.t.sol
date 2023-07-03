// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

// interfaces
import {IDiamondCut} from "contracts/src/diamond/extensions/cut/IDiamondCut.sol";
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";

// libraries

// contracts
import {Town} from "contracts/src/towns/Town.sol";
import {EntitlementsHelper} from "contracts/test/towns/facets/entitlements/EntitlementsSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/facets/channels/ChannelsSetup.sol";
import {RolesHelper} from "contracts/test/towns/facets/roles/RolesSetup.sol";

import {TownInit} from "contracts/test/towns/initializers/TownInit.sol";

import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";

abstract contract TownTest is TestUtils {
  address internal townOwnerToken;
  address internal deployer;
  address internal town;
  address internal townOwner;

  function setUp() public virtual {
    deployer = _randomAddress();
    townOwner = _randomAddress();

    vm.startPrank(deployer);
    town = address(new Town());
    townOwnerToken = address(new MockERC721());

    TownInit townInit = new TownInit();
    EntitlementsHelper entitlements = new EntitlementsHelper();
    ChannelsHelper channels = new ChannelsHelper();
    RolesHelper roles = new RolesHelper();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);
    cuts[0] = entitlements.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = channels.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = roles.makeCut(IDiamond.FacetCutAction.Add);

    uint256 tokenId = MockERC721(townOwnerToken).mintTo(townOwner);

    IDiamondCut(town).diamondCut(
      cuts,
      address(townInit),
      abi.encodeWithSelector(
        TownInit.init.selector,
        "TEST TOWN",
        townOwnerToken,
        tokenId
      )
    );

    vm.stopPrank();
  }

  function addMockEntitlement() internal returns (address) {
    MockUserEntitlement entitlement = new MockUserEntitlement();
    entitlement.initialize(town);

    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(entitlement));

    return address(entitlement);
  }
}
