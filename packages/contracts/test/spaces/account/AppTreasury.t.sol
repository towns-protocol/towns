// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {AppAccountBaseTest} from "test/spaces/account/AppAccountBase.t.sol";

// libraries

// contracts
import {MockSimpleApp} from "test/mocks/MockSimpleApp.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";

contract AppTreasuryTest is AppAccountBaseTest {
    function test_requestFunds() external {
        address owner = _randomAddress();
        address client = _randomAddress();

        MockSimpleApp mockSimpleApp = _deployMockSimpleApp(owner);
        MockERC20 mockERC20 = new MockERC20("Test Token", "TEST");

        vm.label(address(mockSimpleApp), "MockSimpleApp");
        vm.label(address(mockERC20), "Test Token");

        _registerAppAs(owner, mockSimpleApp, client);
        _installAppAs(founder, mockSimpleApp);

        mockERC20.mint(address(appAccount), 10 ether);

        vm.prank(founder);
        appTreasury.configureStream(address(mockSimpleApp), address(mockERC20), 1 ether);

        uint256 streamBalance = appTreasury.getStreamBalance(
            address(mockSimpleApp),
            address(mockERC20)
        );
        assertEq(streamBalance, 0);

        vm.warp(block.timestamp + 1 seconds);

        streamBalance = appTreasury.getStreamBalance(address(mockSimpleApp), address(mockERC20));
        assertEq(streamBalance, 1 ether);

        vm.prank(client);
        appAccount.execute({
            target: address(mockSimpleApp),
            value: 0,
            data: abi.encodeCall(mockSimpleApp.swap, (address(mockERC20)))
        });
    }
}
