// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";
import {IManagedProxy} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";

// libraries

// contracts
import {ProxyManagerSetup} from "contracts/test/diamond/proxy/ProxyManagerSetup.sol";

// mocks
import {DeployMockFacet, MockFacet, IMockFacet} from "contracts/test/mocks/MockFacet.sol";
import {MockDiamondHelper} from "contracts/test/mocks/MockDiamond.sol";

contract ProxyManagerTest is ProxyManagerSetup {
  DeployMockFacet mockFacetHelper = new DeployMockFacet();

  // =============================================================
  //                          Proxy Manager
  // =============================================================

  /// @notice This test creates a new implementation and sets it as the implementation for the proxy manager
  function test_setImplementation() external {
    MockDiamondHelper diamondHelper = new MockDiamondHelper();

    // create a new implementation
    address implementation = address(diamondHelper.createDiamond(deployer));

    // update the implementation to be something else in our proxy manager
    vm.prank(deployer);
    proxyManager.setImplementation(implementation);

    assertEq(
      proxyManager.getImplementation(IProxyManager.getImplementation.selector),
      implementation
    );
  }

  // =============================================================
  //                        Managed Proxy
  // =============================================================

  /// @notice This test verifies that just because the implementation supports an interface
  function test_supportedInterfaces() external {
    assertTrue(
      IERC165(address(implementation)).supportsInterface(
        type(IERC165).interfaceId
      )
    );

    assertFalse(
      IERC165(address(managedProxy)).supportsInterface(
        type(IERC165).interfaceId
      )
    );

    vm.prank(managedProxyOwner);
    managedProxy.dangerous_addInterface(type(IERC165).interfaceId);

    assertTrue(
      IERC165(address(managedProxy)).supportsInterface(
        type(IERC165).interfaceId
      )
    );
  }

  /// @notice This test checks that the owner of the proxy is different from the owner of the implementation
  function test_proxyOwner() external {
    assertEq(IERC173(address(implementation)).owner(), deployer);
    assertEq(IERC173(address(managedProxy)).owner(), managedProxyOwner);
  }

  /// @notice This test adds a new facet to our main implementation, which means our managedProxy should now have access to it as well
  function test_proxyContainsGlobalDiamondCuts() external {
    address mockFacet = mockFacetHelper.deploy();

    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = mockFacetHelper.makeCut(
      mockFacet,
      IDiamond.FacetCutAction.Add
    );

    vm.prank(deployer);
    IDiamondCut(address(implementation)).diamondCut(extensions, address(0), "");

    assertEq(IMockFacet(address(managedProxy)).mockFunction(), 42);
  }

  /// @notice This test adds a custom new facet to our managedProxy, which means our implementation should not have access to it
  function test_proxyContainsCustomCuts() external {
    // add some facets to diamond
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = mockFacetHelper.makeCut(
      mockFacetHelper.deploy(),
      IDiamond.FacetCutAction.Add
    );

    vm.prank(managedProxyOwner);
    IDiamondCut(address(managedProxy)).diamondCut(extensions, address(0), "");

    // assert facet function is callable from managedProxy
    IMockFacet(address(managedProxy)).mockFunction();

    // assert facet function is not callable from implementation
    vm.expectRevert();
    IMockFacet(address(implementation)).mockFunction();
  }

  function test_setManager() external {
    address currentManager = IManagedProxy(address(managedProxy)).getManager();
    assertEq(currentManager, address(proxyManager));

    // Create a new manager
    address newManager = _randomAddress();

    // We're opting out of using the managedProxy manager
    vm.prank(managedProxyOwner);
    IManagedProxy(address(managedProxy)).setManager(newManager);

    // since we changed the manager, we should no longer be able to call the mock function
    vm.expectRevert();
    IMockFacet(address(managedProxy)).mockFunction();
  }

  // =============================================================
  //                           Upgrade
  // =============================================================
  function test_upgradePath() external {
    address mockFacet = mockFacetHelper.deploy();

    // add some facets to diamond
    IDiamond.FacetCut[] memory extensions = new IDiamond.FacetCut[](1);
    extensions[0] = mockFacetHelper.makeCut(
      mockFacet,
      IDiamond.FacetCutAction.Add
    );

    vm.prank(deployer);
    IDiamondCut(address(implementation)).diamondCut(
      extensions,
      mockFacet,
      abi.encodeWithSelector(MockFacet.__MockFacet_init.selector, 42)
    );

    vm.prank(managedProxyOwner);
    IMockFacet(address(managedProxy)).upgrade();

    // assert facet function is callable from managedProxy
    assertEq(IMockFacet(address(managedProxy)).getValue(), 100);
  }
}
