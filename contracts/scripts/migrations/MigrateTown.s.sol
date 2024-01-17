// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";

//contracts
import {Migration} from "../common/Migration.s.sol";

// helpers
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsHelper.sol";

// facets
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";

contract MigrateTown is Migration {
  ChannelsHelper channelsHelper = new ChannelsHelper();

  function __migration(uint256 deployerPK, address) public override {
    address diamond = getDeployment("town");
    uint256 index = 0;

    vm.startBroadcast(deployerPK);
    address channels = address(new Channels());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);

    // add new selector
    bytes4[] memory selectorsToAdd = new bytes4[](1);
    selectorsToAdd[0] = IChannel.getRolesByChannel.selector;
    cuts[index++] = IDiamond.FacetCut({
      facetAddress: channels,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: selectorsToAdd
    });

    // replace old selectors with new channels contract
    channelsHelper.removeSelector(IChannel.getRolesByChannel.selector);
    cuts[index++] = IDiamond.FacetCut({
      facetAddress: channels,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: channelsHelper.selectors()
    });

    vm.startBroadcast(deployerPK);
    IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    vm.stopBroadcast();
  }
}
