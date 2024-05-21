// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMetadata} from "./IMetadata.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract MetadataFacet is IMetadata, OwnableBase, Facet {
  function __MetadataFacet_init(
    bytes32 _contractType,
    string memory _contractURI
  ) external onlyInitializing {
    __MetadataFacet_init_unchained(_contractType, _contractURI);
  }

  function __MetadataFacet_init_unchained(
    bytes32 _contractType,
    string memory _contractURI
  ) internal {
    _addInterface(type(IMetadata).interfaceId);

    MetadataStorage.Layout storage ds = MetadataStorage.layout();
    ds.contractType = _contractType;
    ds.contractURI = _contractURI;
  }

  function contractType() external view returns (bytes32) {
    return MetadataStorage.layout().contractType;
  }

  function contractVersion() external view virtual returns (uint32) {
    return _getInitializedVersion();
  }

  function contractURI() external view returns (string memory) {
    return MetadataStorage.layout().contractURI;
  }

  function setContractURI(string calldata uri) external onlyOwner {
    MetadataStorage.layout().contractURI = uri;
    emit ContractURIChanged(uri);
  }
}

// =============================================================
//                           Storage
// =============================================================

library MetadataStorage {
  struct Layout {
    bytes32 contractType;
    string contractURI;
  }

  // keccak256(abi.encode(uint256(keccak256("diamond.facets.metadata.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xf5e7800d151c04390bdf7c63536bd6072359c9f89940782fbad33a288db56300;

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}
