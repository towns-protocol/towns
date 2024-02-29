// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";

interface IMockFacet {
  function mockFunction() external pure returns (uint256);

  function anotherMockFunction() external pure returns (uint256);

  function setValue(uint256 value_) external;

  function getValue() external view returns (uint256);
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

contract MockFacet is IMockFacet, TokenOwnableBase {
  using MockFacetStorage for MockFacetStorage.Layout;

  function init(uint256 value) external {
    require(value > 10, "value must be greater than 10");
    MockFacetStorage.layout().value = value;
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

contract MockFacetHelper is FacetHelper {
  MockFacet internal mockFacet;

  constructor() {
    mockFacet = new MockFacet();
  }

  function facet() public view override returns (address) {
    return address(mockFacet);
  }

  function selectors()
    public
    pure
    override
    returns (bytes4[] memory selectors_)
  {
    selectors_ = new bytes4[](4);

    uint256 index;
    selectors_[index++] = MockFacet.mockFunction.selector;
    selectors_[index++] = MockFacet.anotherMockFunction.selector;
    selectors_[index++] = MockFacet.setValue.selector;
    selectors_[index++] = MockFacet.getValue.selector;
  }

  function initializer() public pure override returns (bytes4) {
    return bytes4(0);
  }

  function supportedInterfaces()
    public
    pure
    returns (bytes4[] memory interfaces)
  {
    interfaces = new bytes4[](1);
    interfaces[0] = type(IMockFacet).interfaceId;
  }
}
