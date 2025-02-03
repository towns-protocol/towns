// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {UpgradeableBeacon} from "solady/utils/UpgradeableBeacon.sol";
import {Initializable_AlreadyInitialized} from "@river-build/diamond/src/facets/initializable/Initializable.sol";
import {DeployTownsBase} from "contracts/scripts/deployments/utils/DeployTownsBase.s.sol";
import {DelegationProxy} from "contracts/src/base/registry/facets/distribution/v2/DelegationProxy.sol";
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

contract DelegationProxyTest is TestUtils {
  DeployTownsBase internal deployTownsTokenBase = new DeployTownsBase();

  address internal deployer;
  address internal towns;
  address internal beacon;
  address internal proxy;

  function setUp() public {
    deployer = getDeployer();
    towns = deployTownsTokenBase.deploy(deployer);
    beacon = address(
      new UpgradeableBeacon(deployer, address(new DelegationProxy()))
    );
    proxy = LibClone.deployERC1967BeaconProxy(beacon);
  }

  function test_initialize_revertIf_alreadyInitialized() public {
    DelegationProxy(proxy).initialize(towns, deployer);

    vm.expectRevert(
      abi.encodeWithSelector(
        Initializable_AlreadyInitialized.selector,
        uint32(1)
      )
    );

    vm.prank(deployer);
    DelegationProxy(proxy).initialize(towns, deployer);
  }

  function test_fuzz_initialize(address delegatee) public {
    vm.assume(delegatee != address(0));

    vm.prank(deployer);
    DelegationProxy(proxy).initialize(towns, delegatee);

    assertEq(DelegationProxy(proxy).factory(), deployer);
    assertEq(DelegationProxy(proxy).stakeToken(), towns);
    assertEq(IVotes(towns).delegates(proxy), delegatee);
    assertEq(IERC20(towns).allowance(proxy, deployer), type(uint256).max);
  }

  function test_fuzz_reinitialize_revertIf_notFactory(address caller) public {
    vm.assume(caller != deployer);

    test_fuzz_initialize(deployer);

    vm.prank(caller);
    vm.expectRevert();
    DelegationProxy(proxy).reinitialize(towns);
  }

  function test_fuzz_reinitialize(address delegatee) public {
    test_fuzz_initialize(delegatee);

    deployTownsTokenBase.setSalts(_randomBytes32(), _randomBytes32());
    address token = deployTownsTokenBase.deploy(deployer);

    vm.prank(deployer);
    DelegationProxy(proxy).reinitialize(token);

    assertEq(DelegationProxy(proxy).factory(), deployer);
    assertEq(DelegationProxy(proxy).stakeToken(), token);
    assertEq(IVotes(token).delegates(proxy), delegatee);
    assertEq(IERC20(token).allowance(proxy, deployer), type(uint256).max);
  }

  function test_fuzz_redelegate_revertIf_notFactory(address caller) public {
    vm.assume(caller != deployer);

    test_fuzz_initialize(deployer);

    vm.prank(caller);
    vm.expectRevert();
    DelegationProxy(proxy).redelegate(deployer);
  }

  function test_fuzz_redelegate(
    address delegatee,
    address newDelegatee
  ) public {
    vm.assume(delegatee != newDelegatee);

    test_fuzz_initialize(delegatee);

    vm.prank(deployer);
    DelegationProxy(proxy).redelegate(newDelegatee);

    assertEq(IVotes(towns).delegates(proxy), newDelegatee);
  }

  function test_upgradeBeacon() public {
    test_fuzz_initialize(deployer);

    DelegationProxy newImpl = new DelegationProxy();

    vm.prank(deployer);
    UpgradeableBeacon(beacon).upgradeTo(address(newImpl));

    // Verify proxy still works with new implementation
    vm.prank(deployer);
    DelegationProxy(proxy).redelegate(address(1));
  }
}
