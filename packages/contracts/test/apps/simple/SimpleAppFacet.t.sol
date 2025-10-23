// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAccount} from "@eth-infinitism/account-abstraction/interfaces/IAccount.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ISimpleApp} from "../../../src/apps/simple/app/ISimpleApp.sol";

// libraries

// contracts
import {SimpleAppFacet} from "../../../src/apps/simple/app/SimpleAppFacet.sol";
import {SimpleAppBaseTest} from "./SimpleAppBase.t.sol";

contract SimpleAppFacetTest is SimpleAppBaseTest {
    function test_createApp() external {
        _createSimpleApp(appDeveloper, appClient);
    }

    function test_supportsInterface() external {
        _createSimpleApp(appDeveloper, appClient);

        SimpleAppFacet simpleAppFacet = SimpleAppFacet(payable(SIMPLE_APP));
        assertEq(simpleAppFacet.supportsInterface(type(ISimpleApp).interfaceId), true);
        assertEq(simpleAppFacet.supportsInterface(type(IAccount).interfaceId), true);
        assertEq(simpleAppFacet.supportsInterface(type(IERC165).interfaceId), true);
    }

    function test_withdrawETH() external givenSimpleAppIsCreatedAndInstalled {
        vm.prank(appDeveloper);
        SimpleAppFacet(payable(SIMPLE_APP)).withdrawETH(appDeveloper);
        assertEq(appDeveloper.balance, SIMPLE_APP_INSTALL_PRICE);
    }

    function test_executeAsClient() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        _sendNativeToken(appClient, recipient, SIMPLE_APP_INSTALL_PRICE);

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    function test_executeAsDeveloper() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        _sendNativeToken(appDeveloper, recipient, SIMPLE_APP_INSTALL_PRICE);

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    function test_revertWhen_execute_unauthorizedCaller()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        address unauthorized = _randomAddress();
        address recipient = _randomAddress();

        vm.expectRevert(SimpleAccount__NotFromTrustedCaller.selector);
        _sendNativeToken(unauthorized, recipient, SIMPLE_APP_INSTALL_PRICE);
    }

    function test_updatePricing() external givenSimpleAppIsCreatedAndInstalled {
        uint256 newInstallPrice = SIMPLE_APP_INSTALL_PRICE + 1;
        uint48 newDuration = 366 days;

        SimpleAppFacet simpleAppFacet = SimpleAppFacet(payable(SIMPLE_APP));

        vm.prank(appDeveloper);
        simpleAppFacet.updatePricing(newInstallPrice, newDuration);

        assertEq(simpleAppFacet.installPrice(), newInstallPrice);
        assertEq(simpleAppFacet.accessDuration(), newDuration);
    }

    function test_updatePermissions() external givenSimpleAppIsCreatedAndInstalled {
        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = bytes32("Read");
        newPermissions[1] = bytes32("Write");
        SimpleAppFacet simpleAppFacet = SimpleAppFacet(payable(SIMPLE_APP));

        vm.prank(appDeveloper);
        simpleAppFacet.updatePermissions(newPermissions);

        assertEq(simpleAppFacet.requiredPermissions(), newPermissions);
    }
}
