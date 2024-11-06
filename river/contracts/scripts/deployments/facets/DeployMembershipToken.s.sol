// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {MembershipToken} from "contracts/src/spaces/facets/membership/token/MembershipToken.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployMembershipToken is FacetHelper, Deployer {
  constructor() {
    addSelector(IERC721A.totalSupply.selector);
    addSelector(IERC721A.balanceOf.selector);
    addSelector(IERC721A.ownerOf.selector);
    addSelector(IERC721A.transferFrom.selector);
    addSelector(IERC721A.approve.selector);
    addSelector(IERC721A.getApproved.selector);
    addSelector(IERC721A.setApprovalForAll.selector);
    addSelector(IERC721A.isApprovedForAll.selector);
    addSelector(IERC721A.name.selector);
    addSelector(IERC721A.symbol.selector);
    addSelector(IERC721A.tokenURI.selector);
    addSelector(bytes4(keccak256("safeTransferFrom(address,address,uint256)")));
    addSelector(
      bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)"))
    );
  }

  function initializer() public pure override returns (bytes4) {
    return ERC721A.__ERC721A_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "membershipTokenFacet";
  }

  function makeInitData(
    string memory name,
    string memory symbol
  ) public pure returns (bytes memory) {
    return abi.encode(name, symbol);
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    MembershipToken facet = new MembershipToken();
    vm.stopBroadcast();
    return address(facet);
  }
}
