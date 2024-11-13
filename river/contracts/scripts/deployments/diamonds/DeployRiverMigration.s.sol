// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//libraries

//contracts
import {Diamond} from "contracts/src/diamond/Diamond.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

// deployers
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployPausable} from "contracts/scripts/deployments/facets/DeployPausable.s.sol";
import {DeployTokenMigration} from "contracts/scripts/deployments/facets/DeployTokenMigration.s.sol";

contract DeployRiverMigration is DiamondHelper, Deployer {
  address OLD_TOKEN = 0x0000000000000000000000000000000000000000;
  address NEW_TOKEN = 0x0000000000000000000000000000000000000001;

  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployPausable pausableHelper = new DeployPausable();
  DeployTokenMigration tokenMigrationHelper = new DeployTokenMigration();

  address multiInit;
  address diamondCut;
  address diamondLoupe;
  address introspection;
  address ownable;
  address pausable;
  address tokenMigration;

  function versionName() public pure override returns (string memory) {
    return "riverMigration";
  }

  function setTokens(address _oldToken, address _newToken) external {
    OLD_TOKEN = _oldToken;
    NEW_TOKEN = _newToken;
  }

  function addImmutableCuts(address deployer) internal {
    multiInit = deployMultiInit.deploy(deployer);
    diamondCut = diamondCutHelper.deploy(deployer);
    diamondLoupe = diamondLoupeHelper.deploy(deployer);
    introspection = introspectionHelper.deploy(deployer);
    ownable = ownableHelper.deploy(deployer);
    pausable = pausableHelper.deploy(deployer);

    addFacet(
      diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
      diamondCut,
      diamondCutHelper.makeInitData("")
    );
    addFacet(
      diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
      diamondLoupe,
      diamondLoupeHelper.makeInitData("")
    );
    addFacet(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
      introspection,
      introspectionHelper.makeInitData("")
    );
    addFacet(
      ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
      ownable,
      ownableHelper.makeInitData(deployer)
    );
    addFacet(
      pausableHelper.makeCut(pausable, IDiamond.FacetCutAction.Add),
      pausable,
      pausableHelper.makeInitData("")
    );
  }

  function diamondInitParams(
    address deployer
  ) public returns (Diamond.InitParams memory) {
    tokenMigration = tokenMigrationHelper.deploy(deployer);

    addFacet(
      tokenMigrationHelper.makeCut(tokenMigration, IDiamond.FacetCutAction.Add),
      tokenMigration,
      tokenMigrationHelper.makeInitData(OLD_TOKEN, NEW_TOKEN)
    );

    return
      Diamond.InitParams({
        baseFacets: baseFacets(),
        init: multiInit,
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          _initAddresses,
          _initDatas
        )
      });
  }

  function __deploy(address deployer) public override returns (address) {
    addImmutableCuts(deployer);

    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

    vm.broadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);
    return address(diamond);
  }
}
