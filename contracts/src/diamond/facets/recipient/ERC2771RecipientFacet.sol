// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ERC2771RecipientBase} from "./ERC2771RecipientBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

library SampleStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("diamond.standard.sample.storage");

  struct Layout {
    address caller;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}

contract ERC2771RecipientFacet is ERC2771RecipientBase, Facet {
  function __ERC2771Recipient_init(
    address trustedForwarder
  ) external onlyInitializing {
    __ERC2771RecipientBase_init(trustedForwarder);
  }

  function getCaller() external view returns (address) {
    return SampleStorage.layout().caller;
  }

  function callGasless() external {
    SampleStorage.layout().caller = _msgSender();
  }
}
