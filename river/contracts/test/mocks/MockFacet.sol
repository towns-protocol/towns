// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

interface IMockFacet {
  function mockFunction() external pure returns (uint256);

  function anotherMockFunction() external pure returns (uint256);

  function setValue(uint256 value_) external;

  function getValue() external view returns (uint256);

  function upgrade() external;
}

library MockFacetStorage {
  bytes32 internal constant MOCK_FACET_STORAGE_POSITION =
    keccak256("mock.facet.storage.position");

  struct Layout {
    uint256 value;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 position = MOCK_FACET_STORAGE_POSITION;
    assembly {
      ds.slot := position
    }
  }
}

contract MockFacet is IMockFacet, TokenOwnableBase, Facet {
  using MockFacetStorage for MockFacetStorage.Layout;

  function __MockFacet_init(uint256 value) external onlyInitializing {
    MockFacetStorage.layout().value = value;
  }

  function upgrade() external reinitializer(2) {
    MockFacetStorage.layout().value = 100;
  }

  function mockFunction() external pure override returns (uint256) {
    return 42;
  }

  function anotherMockFunction() external pure returns (uint256) {
    return 43;
  }

  function setValue(uint256 value_) external onlyOwner {
    MockFacetStorage.layout().value = value_;
  }

  function getValue() external view returns (uint256) {
    return MockFacetStorage.layout().value;
  }
}

contract DeployMockFacet is Deployer, FacetHelper {
  constructor() {
    addSelector(MockFacet.mockFunction.selector);
    addSelector(MockFacet.anotherMockFunction.selector);
    addSelector(MockFacet.upgrade.selector);
    addSelector(MockFacet.setValue.selector);
    addSelector(MockFacet.getValue.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return MockFacet.__MockFacet_init.selector;
  }

  function makeInitData(uint256 value) public pure returns (bytes memory) {
    return abi.encodeWithSelector(MockFacet.__MockFacet_init.selector, value);
  }

  function versionName() public pure override returns (string memory) {
    return "mockFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    MockFacet facet = new MockFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
