// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";
import {IDiamond, Diamond} from "@river-build/diamond/src/Diamond.sol";

// debugging
import {console} from "forge-std/console.sol";

contract InteractMigration is Interaction, DiamondHelper {
  struct FacetConfig {
    IDiamond.FacetCutAction action;
    string diamond;
    string facet;
  }

  function _migrationConfigPath() internal returns (string memory path) {
    string memory context = vm.envOr("DEPLOYMENT_CONTEXT", string("alpha"));
    path = string.concat(
      vm.projectRoot(),
      "/contracts/scripts/migrations/",
      context,
      ".json"
    );
  }

  function __interact(address deployer) internal override {
    string memory config = _migrationConfigPath();
    console.log(config);
  }
}
