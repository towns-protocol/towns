// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interface
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {Deployer} from "../common/Deployer.s.sol";

// facets
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {GuardianFacet} from "contracts/src/towns/facets/guardian/GuardianFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";

// helpers
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {GuardianHelper} from "contracts/test/towns/guardian/GuardianSetup.sol";

import {TownOwnerHelper} from "contracts/test/towns/owner/TownOwnerSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployTownOwner is Deployer {
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  OwnableHelper ownableHelper = new OwnableHelper();
  GuardianHelper guardianHelper = new GuardianHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();

  TownOwnerHelper townOwnerHelper = new TownOwnerHelper();

  address[] addresses = new address[](6);
  bytes[] payloads = new bytes[](6);

  address diamondCut;
  address diamondLoupe;
  address ownable;
  address townOwner;
  address guardian;
  address introspection;
  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "townOwner";
  }

  function __deploy(
    uint256 deployerPK,
    address deployer
  ) public override returns (address) {
    vm.startBroadcast();
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    ownable = address(new OwnableFacet());
    townOwner = address(new TownOwner());
    guardian = address(new GuardianFacet());
    introspection = address(new IntrospectionFacet());
    multiInit = address(new MultiInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](6);
    uint256 index;

    cuts[index++] = diamondCutHelper.makeCut(
      diamondCut,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = diamondLoupeHelper.makeCut(
      diamondLoupe,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add);

    cuts[index++] = introspectionHelper.makeCut(
      introspection,
      IDiamond.FacetCutAction.Add
    );

    cuts[index++] = townOwnerHelper.makeCut(
      townOwner,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = guardianHelper.makeCut(
      guardian,
      IDiamond.FacetCutAction.Add
    );

    index = 0;

    addresses[index++] = diamondCut;
    addresses[index++] = diamondLoupe;
    addresses[index++] = ownable;
    addresses[index++] = introspection;
    addresses[index++] = townOwner;
    addresses[index++] = guardian;

    index = 0;

    payloads[index++] = diamondCutHelper.makeInitData("");
    payloads[index++] = diamondLoupeHelper.makeInitData("");
    payloads[index++] = ownableHelper.makeInitData(abi.encode(deployer));
    payloads[index++] = introspectionHelper.makeInitData("");
    payloads[index++] = abi.encodeWithSelector(
      townOwnerHelper.initializer(),
      "Town Owner",
      "TOWN"
    );
    payloads[index++] = guardianHelper.makeInitData(7 days);

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
