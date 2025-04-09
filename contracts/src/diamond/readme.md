## Guidelines for creating a facet

- Use diamond storage `Layout` for storing variables `<FacetName>Storage`
- Specify your internal business logic, and interaction with storage in `<FacetName>Base` abstract contract
- Create you initializers and your protected external calls in the `<FacetName>Facet` contract
- Define your external and internal interface in `I<FacetName>` interface file
  - `I<FacetName>Base` internal interface gets inherited by your `<FacetName>Base` abstract contract and it usually holds structs, enums, errors and events
  - `I<FacetName>` external interface gets inherited by your `<FacetName>Facet` contract and it usually holds external functions, this interface can inherit your internal `I<FacetName>Base` to have access to its data types

> Minimal example

```solidity
library SampleStorage {
  struct Layout {
    uint256 value;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = keccak256("sample.storage");
    assembly {
      ds.slot := slot
    }
  }
}

interface ISampleBase {
  event ValueSet(uint256 value);
}

inteface ISample is ISampleBase {
  function setValue(uint256) external;
}

abstract contract SampleBase is ISampleBase {
  function _setValue(uint256 val) internal {
    SampleStorage.layout().value = x;
    emit ValueSet(val);
  }
}

contract SampleFacet is ISample, SampleBase {
  function setValue(uint256 val) onlyOwner external {
    _setValue(val);
  }
}
```
