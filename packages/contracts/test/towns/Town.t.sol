// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";
import {RolesHelper} from "contracts/test/towns/roles/RolesSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsSetup.sol";

contract TownHelper {
  function createImplementation(address owner) external returns (Diamond) {
    OwnableHelper ownableHelper = new OwnableHelper();
    DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
    DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
    EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
    RolesHelper rolesHelper = new RolesHelper();
    ChannelsHelper channelsHelper = new ChannelsHelper();

    uint256 cutCount = 6;

    Diamond.FacetCut[] memory cuts = new Diamond.FacetCut[](cutCount);
    cuts[0] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = diamondCutHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = diamondLoupeHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[3] = entitlementsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[4] = rolesHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[5] = channelsHelper.makeCut(IDiamond.FacetCutAction.Add);

    return
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: ownableHelper.facet(),
          initData: ownableHelper.makeInitData(abi.encode(owner))
        })
      );
  }
}
