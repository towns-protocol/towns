// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interface
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {Deployer} from "./common/Deployer.s.sol";

// facets
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";

// helpers
import {TownOwnerHelper} from "contracts/test/towns/owner/TownOwnerSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployTownOwner is Deployer {
  OwnableHelper ownableHelper = new OwnableHelper();
  TownOwnerHelper townOwnerHelper = new TownOwnerHelper();

  address[] addresses = new address[](2);
  bytes[] payloads = new bytes[](2);

  address ownable;
  address townOwner;
  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "townOwner";
  }

  function __deploy(
    uint256 deployerPK,
    address deployer
  ) public override returns (address) {
    vm.startBroadcast();
    ownable = address(new OwnableFacet());
    townOwner = address(new TownOwner());
    multiInit = address(new MultiInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    uint256 index;

    cuts[index++] = ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add);
    cuts[index++] = townOwnerHelper.makeCut(
      townOwner,
      IDiamond.FacetCutAction.Add
    );

    addresses[0] = ownable;
    addresses[1] = townOwner;

    payloads[0] = ownableHelper.makeInitData(abi.encode(deployer));
    payloads[1] = abi.encodeWithSelector(
      townOwnerHelper.initializer(),
      "Town Owner",
      "TOWN"
    );

    vm.startBroadcast(deployerPK);
    address townOwnerAddress = address(
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: multiInit,
          initData: abi.encodeWithSelector(
            MultiInit.multiInit.selector,
            addresses,
            payloads
          )
        })
      )
    );
    vm.stopBroadcast();

    return townOwnerAddress;
  }
}
