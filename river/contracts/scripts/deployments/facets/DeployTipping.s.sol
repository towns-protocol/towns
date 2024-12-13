// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {TippingFacet} from "contracts/src/spaces/facets/tipping/TippingFacet.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployTipping is FacetHelper, Deployer {
  constructor() {
    addSelector(TippingFacet.tip.selector);
    addSelector(TippingFacet.tipsByCurrencyAndTokenId.selector);
    addSelector(TippingFacet.tippingCurrencies.selector);
    addSelector(TippingFacet.totalTipsByCurrency.selector);
    addSelector(TippingFacet.tipAmountByCurrency.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return TippingFacet.__Tipping_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "tippingFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    TippingFacet tipping = new TippingFacet();
    vm.stopBroadcast();
    return address(tipping);
  }
}
