// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {AppAccountBaseTest} from "test/spaces/account/AppAccountBase.t.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {ISimpleApp, ISimpleAppBase} from "src/apps/simple/app/ISimpleApp.sol";

// libraries

// contracts
import {MockERC20} from "test/mocks/MockERC20.sol";

contract AppTreasuryTest is AppAccountBaseTest, ISimpleAppBase {
    function test_requestFunds() external {
        address owner = _randomAddress();
        address bot = _randomAddress();

        MockERC20 mockERC20 = new MockERC20("Test Token", "TEST");
        vm.label(address(mockERC20), "Test Token");

        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");

        AppParams memory appParams = AppParams({
            name: "test.app",
            permissions: permissions,
            client: bot,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION
        });

        (address botApp, ) = _createAppAs(owner, appParams);
        ISimpleApp botAppContract = ISimpleApp(botApp);
        vm.label(botApp, "Bot App");

        _installAppAs(founder, ITownsApp(botApp));

        mockERC20.mint(address(appAccount), 10 ether);

        uint256 flowRate = 1 ether;
        uint256 maxBalance = 10 ether;

        vm.prank(founder);
        appTreasury.configureStream(address(botApp), address(mockERC20), flowRate, maxBalance);

        uint256 streamBalance = appTreasury.getStreamBalance(address(botApp), address(mockERC20));
        assertEq(streamBalance, 0);

        vm.warp(block.timestamp + 1 seconds);

        streamBalance = appTreasury.getStreamBalance(address(botApp), address(mockERC20));
        assertEq(streamBalance, 1 ether);

        vm.prank(bot);
        vm.expectEmit(address(botApp));
        emit FundsReceived(address(appAccount), address(mockERC20), 1 ether);
        appAccount.execute({
            target: address(botApp),
            value: 0,
            data: abi.encodeCall(botAppContract.requestFunds, (address(mockERC20), 1 ether))
        });

        assertEq(mockERC20.balanceOf(address(appAccount)), 9 ether);
        assertEq(mockERC20.balanceOf(botApp), 1 ether);
    }
}
