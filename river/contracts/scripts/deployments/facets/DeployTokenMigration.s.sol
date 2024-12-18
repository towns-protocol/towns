// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {TokenMigrationFacet} from "contracts/src/tokens/migration/TokenMigration.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployTokenMigration is FacetHelper, Deployer {
  constructor() {
    addSelector(TokenMigrationFacet.migrate.selector);
    addSelector(TokenMigrationFacet.emergencyWithdraw.selector);
    addSelector(TokenMigrationFacet.tokens.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return TokenMigrationFacet.__TokenMigrationFacet_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "tokenMigrationFacet";
  }

  function makeInitData(
    address oldToken,
    address newToken
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(initializer(), IERC20(oldToken), IERC20(newToken));
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    TokenMigrationFacet tokenMigration = new TokenMigrationFacet();
    vm.stopBroadcast();
    return address(tokenMigration);
  }
}
