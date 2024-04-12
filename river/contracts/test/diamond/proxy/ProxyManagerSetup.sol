// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";

// helpers
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// mocks
import {MockDiamondHelper} from "contracts/test/mocks/MockDiamond.sol";
import {MockOwnableManagedProxy} from "contracts/test/mocks/MockOwnableManagedProxy.sol";

// debuggging

abstract contract ProxyManagerSetup is FacetTest {
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();
  MockDiamondHelper mockDiamondHelper = new MockDiamondHelper();

  address internal proxyOwner;
  address internal proxyTokenOwner;

  ProxyManager internal proxyManager;
  MockOwnableManagedProxy internal proxy;
  Diamond internal implementation;

  function setUp() public virtual override {
    super.setUp();

    proxyOwner = _randomAddress();
    proxyTokenOwner = _randomAddress();
    proxyManager = ProxyManager(diamond);

    // Create an ownable managed proxy
    // The owner of the managed proxy is a proxyOwner
    vm.prank(proxyOwner);
    proxy = new MockOwnableManagedProxy(
      ProxyManager.getImplementation.selector,
      address(proxyManager)
    );
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    MultiInit multiInit = new MultiInit();

    // Create a mock implementation for the proxy manager to use
    // The owner of the implementation is the deployer
    implementation = mockDiamondHelper.createDiamond(deployer);

    address cut = diamondCutHelper.deploy();
    address loupe = diamondLoupeHelper.deploy();
    address introspection = introspectionHelper.deploy();
    address ownable = ownableHelper.deploy();
    address manager = address(new ProxyManager());

    addFacet(
      diamondCutHelper.makeCut(cut, IDiamond.FacetCutAction.Add),
      cut,
      diamondCutHelper.makeInitData("")
    );
    addFacet(
      diamondLoupeHelper.makeCut(loupe, IDiamond.FacetCutAction.Add),
      loupe,
      diamondLoupeHelper.makeInitData("")
    );
    addFacet(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
      introspection,
      introspectionHelper.makeInitData("")
    );
    addFacet(
      proxyManagerHelper.makeCut(manager, IDiamond.FacetCutAction.Add),
      manager,
      proxyManagerHelper.makeInitData(address(implementation))
    );
    addFacet(
      ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
      ownable,
      ownableHelper.makeInitData(deployer)
    );

    return
      Diamond.InitParams({
        baseFacets: baseFacets(),
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          _initAddresses,
          _initDatas
        )
      });
  }
}

contract ProxyManagerHelper is FacetHelper {
  constructor() {
    addSelector(ProxyManager.getImplementation.selector);
    addSelector(ProxyManager.setImplementation.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return ProxyManager.__ProxyManager_init.selector;
  }

  function makeInitData(
    address implementation
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        ProxyManager.__ProxyManager_init.selector,
        implementation
      );
  }
}
