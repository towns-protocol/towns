// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {UpgradeableBeacon} from "solady/utils/UpgradeableBeacon.sol";
import {Initializable_AlreadyInitialized} from "@river-build/diamond/src/facets/initializable/Initializable.sol";
import {DeployRiverBase} from "contracts/scripts/deployments/utils/DeployRiverBase.s.sol";
import {DelegationProxy} from "contracts/src/base/registry/facets/distribution/v2/DelegationProxy.sol";

contract DelegationProxyTest is TestUtils {
  DeployRiverBase internal deployRiverTokenBase = new DeployRiverBase();

  address internal deployer;
  address internal river;
  address internal beacon;

  function setUp() public {
    deployer = getDeployer();
    river = deployRiverTokenBase.deploy(deployer);
    beacon = address(
      new UpgradeableBeacon(deployer, address(new DelegationProxy()))
    );
  }

  function test_initialize_revertIf_alreadyInitialized() public {
    address proxy = LibClone.deployERC1967BeaconProxy(beacon);
    DelegationProxy(proxy).initialize(river, deployer);

    vm.expectRevert(
      abi.encodeWithSelector(
        Initializable_AlreadyInitialized.selector,
        uint32(1)
      )
    );

    vm.prank(deployer);
    DelegationProxy(proxy).initialize(river, deployer);
  }

  function test_fuzz_initialize(address delegatee) public {
    vm.assume(delegatee != address(0));
    address proxy = LibClone.deployERC1967BeaconProxy(beacon);

    vm.prank(deployer);
    DelegationProxy(proxy).initialize(river, delegatee);

    assertEq(DelegationProxy(proxy).factory(), deployer);
    assertEq(DelegationProxy(proxy).stakeToken(), river);
    assertEq(ERC20Votes(river).delegates(proxy), delegatee);
    assertEq(ERC20Votes(river).allowance(proxy, deployer), type(uint256).max);
  }

  function test_fuzz_redelegate_revertIf_notFactory(address caller) public {
    vm.assume(caller != deployer);
    address proxy = LibClone.deployERC1967BeaconProxy(beacon);

    vm.prank(deployer);
    DelegationProxy(proxy).initialize(river, deployer);

    vm.prank(caller);
    vm.expectRevert();
    DelegationProxy(proxy).redelegate(deployer);
  }

  function test_fuzz_redelegate(
    address delegatee,
    address newDelegatee
  ) public {
    vm.assume(delegatee != address(0));
    vm.assume(delegatee != newDelegatee);
    address proxy = LibClone.deployERC1967BeaconProxy(beacon);

    vm.prank(deployer);
    DelegationProxy(proxy).initialize(river, delegatee);

    vm.prank(deployer);
    DelegationProxy(proxy).redelegate(newDelegatee);

    assertEq(ERC20Votes(river).delegates(proxy), newDelegatee);
  }

  function test_upgradeBeacon() public {
    address proxy = LibClone.deployERC1967BeaconProxy(beacon);

    vm.prank(deployer);
    DelegationProxy(proxy).initialize(river, deployer);

    DelegationProxy newImpl = new DelegationProxy();

    vm.prank(deployer);
    UpgradeableBeacon(beacon).upgradeTo(address(newImpl));

    // Verify proxy still works with new implementation
    vm.prank(deployer);
    DelegationProxy(proxy).redelegate(address(1));
  }
}
