// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAccount} from "@eth-infinitism/account-abstraction/interfaces/IAccount.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ISimpleApp} from "../../../src/apps/simple/app/ISimpleApp.sol";

// libraries
import {CurrencyTransfer} from "../../../src/utils/libraries/CurrencyTransfer.sol";

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

    function test_sendCurrencyAsClient() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        vm.prank(appClient);
        SimpleAppFacet(payable(SIMPLE_APP)).sendCurrency(
            recipient,
            CurrencyTransfer.NATIVE_TOKEN,
            SIMPLE_APP_INSTALL_PRICE
        );

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    function test_sendCurrencyAsDeveloper() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        vm.prank(appDeveloper);
        SimpleAppFacet(payable(SIMPLE_APP)).sendCurrency(
            recipient,
            CurrencyTransfer.NATIVE_TOKEN,
            SIMPLE_APP_INSTALL_PRICE
        );

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    function test_revertWhen_sendCurrency_invalidCaller()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        vm.prank(_randomAddress());
        vm.expectRevert(SimpleApp__InvalidCaller.selector);
        SimpleAppFacet(payable(SIMPLE_APP)).sendCurrency(
            appDeveloper,
            CurrencyTransfer.NATIVE_TOKEN,
            SIMPLE_APP_INSTALL_PRICE
        );
    }

    function test_revertWhen_sendCurrency_invalidRecipient()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        vm.prank(appDeveloper);
        vm.expectRevert(SimpleApp__ZeroAddress.selector);
        SimpleAppFacet(payable(SIMPLE_APP)).sendCurrency(
            address(0),
            address(0),
            SIMPLE_APP_INSTALL_PRICE
        );
    }

    function test_revertWhen_sendCurrency_invalidAmount()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        vm.prank(appDeveloper);
        vm.expectRevert(SimpleApp__InvalidAmount.selector);
        SimpleAppFacet(payable(SIMPLE_APP)).sendCurrency(appDeveloper, address(0), 0);
    }

    function test_revertWhen_sendCurrency_invalidCurrency()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        vm.prank(appDeveloper);
        vm.expectRevert(SimpleApp__InvalidCurrency.selector);
        SimpleAppFacet(payable(SIMPLE_APP)).sendCurrency(
            appDeveloper,
            _randomAddress(),
            SIMPLE_APP_INSTALL_PRICE
        );
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
