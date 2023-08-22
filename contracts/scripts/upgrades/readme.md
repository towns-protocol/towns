```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import { IDiamond, Diamond } from "contracts/src/diamond/Diamond.sol";
import { IDiamondCut } from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import { Upgrader } from "contracts/scripts/common/Upgrader.s.sol";
import { MockFacetHelper, MockFacet } from "contracts/test/mocks/MockFacet.sol";

contract UpgradeTown is Upgrader {
  MockFacetHelper mockFacetHelper = new MockFacetHelper();

  function __upgrade(uint256 deployerPK, address) public override {
    address town = getAddress("town");

    vm.broadcast(deployerPK);
    address mockFacet = address(new MockFacet());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = mockFacetHelper.makeCut(mockFacet, IDiamond.FacetCutAction.Add);

    vm.broadcast(deployerPK);
    IDiamondCut(town).diamondCut(cuts, address(0), "");
  }
}
```
