// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {OwnablePendingHelper} from "contracts/test/diamond/ownable/pending/OwnablePendingSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";
import {RolesHelper} from "contracts/test/towns/roles/RolesSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsSetup.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {TokenPausableHelper} from "contracts/test/diamond/pausable/token/TokenPausableSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract TownImplementationHelper {
  OwnablePendingHelper ownableHelper = new OwnablePendingHelper();
  TokenPausableHelper tokenPausableHelper = new TokenPausableHelper();
  TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
  RolesHelper rolesHelper = new RolesHelper();
  ChannelsHelper channelsHelper = new ChannelsHelper();

  MultiInit multiInit = new MultiInit();

  address[] initAddresses = new address[](3);
  bytes[] initDatas = new bytes[](3);

  function createImplementation(address owner) external returns (Diamond) {
    uint256 cutCount = 7;
    uint256 index;

    Diamond.FacetCut[] memory cuts = new Diamond.FacetCut[](cutCount);
    cuts[index++] = tokenOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = diamondCutHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = diamondLoupeHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = entitlementsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = rolesHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = tokenPausableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = channelsHelper.makeCut(IDiamond.FacetCutAction.Add);

    initAddresses[0] = ownableHelper.facet();
    initAddresses[1] = diamondCutHelper.facet();
    initAddresses[2] = diamondLoupeHelper.facet();

    initDatas[0] = ownableHelper.makeInitData(owner);
    initDatas[1] = diamondCutHelper.makeInitData("");
    initDatas[2] = diamondLoupeHelper.makeInitData("");

    return
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: address(multiInit),
          initData: abi.encodeWithSelector(
            multiInit.multiInit.selector,
            initAddresses,
            initDatas
          )
        })
      );
  }
}
