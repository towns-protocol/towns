// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {ProxyManager} from "contracts/src/diamond/proxy/manager/ProxyManager.sol";

// helpers
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployProxyManager} from "contracts/scripts/deployments/facets/DeployProxyManager.s.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// mocks
import {MockDiamondHelper} from "contracts/test/mocks/MockDiamond.sol";
import {MockOwnableManagedProxy} from "contracts/test/mocks/MockOwnableManagedProxy.sol";

abstract contract ProxyManagerSetup is FacetTest {
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployProxyManager proxyManagerHelper = new DeployProxyManager();
  MockDiamondHelper mockDiamondHelper = new MockDiamondHelper();

  address internal managedProxyOwner;
  address internal proxyTokenOwner;

  ProxyManager internal proxyManager;
  MockOwnableManagedProxy internal managedProxy;
  Diamond internal implementation;

  function setUp() public virtual override {
    super.setUp();

    managedProxyOwner = _randomAddress();
    proxyTokenOwner = _randomAddress();
    proxyManager = ProxyManager(diamond);

    // Create an ownable managed proxy
    // The owner of the managed proxy is a managedProxyOwner
    // This is similar to our SpaceProxy contract being created
    vm.prank(managedProxyOwner);
    managedProxy = new MockOwnableManagedProxy(
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
    address manager = proxyManagerHelper.deploy();

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
