// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

import {WalletLink} from "contracts/src/river/wallet-link/WalletLink.sol";
import {WalletLinkHelper} from "contracts/test/river/wallet-link/WalletLinkHelper.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployWalletLink is DiamondDeployer {
  // deployments
  DeployDiamondCut cutHelper = new DeployDiamondCut();
  DeployDiamondLoupe loupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployMetadata metadataHelper = new DeployMetadata();
  DeployMultiInit multiInitHelper = new DeployMultiInit();

  // helpers
  WalletLinkHelper walletLinkHelper = new WalletLinkHelper();

  address diamondLoupe;
  address diamondCut;
  address introspection;
  address ownable;
  address walletLink;
  address metadata;
  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "walletLink";
  }

  function diamondInitParams(
    uint256 pk,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    multiInit = multiInitHelper.deploy();

    diamondCut = cutHelper.deploy();
    diamondLoupe = loupeHelper.deploy();
    introspection = introspectionHelper.deploy();
    ownable = ownableHelper.deploy();
    metadata = metadataHelper.deploy();

    vm.startBroadcast(pk);
    walletLink = address(new WalletLink());
    vm.stopBroadcast();

    addFacet(
      cutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
      diamondCut,
      cutHelper.makeInitData("")
    );
    addFacet(
      loupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
      diamondLoupe,
      loupeHelper.makeInitData("")
    );
    addFacet(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
      introspection,
      introspectionHelper.makeInitData("")
    );
    addFacet(
      ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
      ownable,
      ownableHelper.makeInitData(deployer)
    );
    addFacet(
      walletLinkHelper.makeCut(walletLink, IDiamond.FacetCutAction.Add),
      walletLink,
      walletLinkHelper.makeInitData("")
    );
    addFacet(
      metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
      metadata,
      metadataHelper.makeInitData(bytes32("WalletLink"), "")
    );

    return
      Diamond.InitParams({
        baseFacets: baseFacets(),
        init: multiInit,
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          _initAddresses,
          _initDatas
        )
      });
  }
}
