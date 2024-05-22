// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {ITokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/ITokenOwnable.sol";

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {TokenPausableFacet} from "contracts/src/diamond/facets/pausable/token/TokenPausableFacet.sol";

contract DeployTokenPausable is FacetHelper, Deployer {
  constructor() {
    addSelector(TokenPausableFacet.paused.selector);
    addSelector(TokenPausableFacet.pause.selector);
    addSelector(TokenPausableFacet.unpause.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "tokenPausableFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    TokenPausableFacet facet = new TokenPausableFacet();
    vm.stopBroadcast();
    return address(facet);
  }

  function initializer() public pure override returns (bytes4) {
    return TokenPausableFacet.__Pausable_init.selector;
  }
}
