// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";
import {DeployERC721A} from "contracts/scripts/deployments/facets/DeployERC721A.s.sol";

contract DeploySpaceOwnerFacet is FacetHelper, Deployer {
  DeployERC721A erc721aHelper = new DeployERC721A();

  constructor() {
    addSelector(SpaceOwner.setFactory.selector);
    addSelector(SpaceOwner.getFactory.selector);
    addSelector(SpaceOwner.setDefaultUri.selector);
    addSelector(SpaceOwner.getDefaultUri.selector);
    addSelector(SpaceOwner.nextTokenId.selector);
    addSelector(SpaceOwner.mintSpace.selector);
    addSelector(SpaceOwner.getSpaceInfo.selector);
    addSelector(SpaceOwner.getSpaceByTokenId.selector);
    addSelector(SpaceOwner.updateSpaceInfo.selector);
    addSelectors(erc721aHelper.selectors());

    // Votes
    addSelector(IERC6372.clock.selector);
    addSelector(IERC6372.CLOCK_MODE.selector);
    addSelector(IVotes.getVotes.selector);
    addSelector(IVotes.getPastVotes.selector);
    addSelector(IVotes.getPastTotalSupply.selector);
    addSelector(IVotes.delegates.selector);
    addSelector(IVotes.delegate.selector);
    addSelector(IVotes.delegateBySig.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return SpaceOwner.__SpaceOwner_init.selector;
  }

  function makeInitData(
    string memory name,
    string memory symbol
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), name, symbol);
  }

  function versionName() public pure override returns (string memory) {
    return "facets/spaceOwnerFacet";
  }

  function __deploy(
    address deployer
  ) public override returns (address) {
    vm.startBroadcast(deployer);
    SpaceOwner facet = new SpaceOwner();
    vm.stopBroadcast();
    return address(facet);
  }
}
