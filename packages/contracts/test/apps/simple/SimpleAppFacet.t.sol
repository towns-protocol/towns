// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAccount} from "@eth-infinitism/account-abstraction/interfaces/IAccount.sol";
import {PackedUserOperation} from "@eth-infinitism/account-abstraction/interfaces/PackedUserOperation.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC5267} from "@openzeppelin/contracts/interfaces/IERC5267.sol";
import {ISimpleApp} from "../../../src/apps/simple/app/ISimpleApp.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";

// libraries
import {ERC7821Lib} from "./ERC7821Lib.sol";

// contracts
import {SimpleAppFacet} from "../../../src/apps/simple/app/SimpleAppFacet.sol";
import {SimpleAppBaseTest, MockReentrant} from "./SimpleAppBase.t.sol";
import {ERC7821} from "solady/accounts/ERC7821.sol";
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";
import {MockERC721} from "../../mocks/MockERC721.sol";
import {MockERC1155} from "../../mocks/MockERC1155.sol";

contract SimpleAppFacetTest is SimpleAppBaseTest, IOwnableBase {
    // ERC-1271 constants
    bytes4 private constant ERC1271_MAGIC_VALUE = 0x1626ba7e;
    bytes4 private constant INVALID_SIGNATURE = 0xffffffff;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INITIALIZATION                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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

    function test_initialize_setsStateCorrectly() external {
        _createSimpleApp(appDeveloper, appClient);

        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));

        assertEq(app.moduleId(), "simple.app");
        assertEq(app.moduleOwner(), appDeveloper);
        assertEq(app.installPrice(), SIMPLE_APP_INSTALL_PRICE);
        assertEq(app.accessDuration(), 365 days);
        assertEq(address(app.entryPoint()), factory.getEntryPoint());

        bytes32[] memory permissions = app.requiredPermissions();
        assertEq(permissions.length, 1);
        assertEq(permissions[0], bytes32("Read"));

        assertEq(registry.getAppByClient(appClient), SIMPLE_APP);
    }

    function test_initialize_registersAllInterfaces() external {
        _createSimpleApp(appDeveloper, appClient);
        _checkAllInterfaces(SIMPLE_APP);
    }

    function test_revertWhen_initialize_calledTwice() external {
        _createSimpleApp(appDeveloper, appClient);

        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));

        bytes memory initData = abi.encode(
            appDeveloper,
            "simple.app",
            new bytes32[](1),
            SIMPLE_APP_INSTALL_PRICE,
            365 days,
            appClient,
            _getEntryPoint(),
            _getCoordinator()
        );

        vm.expectRevert();
        app.initialize(initData);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              EXECUTE - OWNER AUTHORIZATION                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeAsDeveloper() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        _sendNativeToken(appDeveloper, recipient, SIMPLE_APP_INSTALL_PRICE);

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    function test_execute_ownerCanExecuteBatch() external givenSimpleAppIsCreatedAndInstalled {
        address recipient1 = _randomAddress();
        address recipient2 = _randomAddress();
        address recipient3 = _randomAddress();

        uint256 amount1 = 0.3 ether;
        uint256 amount2 = 0.4 ether;
        uint256 amount3 = 0.3 ether;

        ERC7821.Call[] memory calls = new ERC7821.Call[](3);
        calls[0] = ERC7821Lib.makeCall(recipient1, amount1, "");
        calls[1] = ERC7821Lib.makeCall(recipient2, amount2, "");
        calls[2] = ERC7821Lib.makeCall(recipient3, amount3, "");

        _executeBatch(appDeveloper, calls);

        assertEq(recipient1.balance, amount1);
        assertEq(recipient2.balance, amount2);
        assertEq(recipient3.balance, amount3);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              EXECUTE - CLIENT AUTHORIZATION                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeAsClient() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        _sendNativeToken(appClient, recipient, SIMPLE_APP_INSTALL_PRICE);

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    function test_execute_clientCanExecuteBatch() external givenSimpleAppIsCreatedAndInstalled {
        address recipient1 = _randomAddress();
        address recipient2 = _randomAddress();
        address recipient3 = _randomAddress();

        uint256 amount1 = 0.3 ether;
        uint256 amount2 = 0.4 ether;
        uint256 amount3 = 0.3 ether;

        ERC7821.Call[] memory calls = new ERC7821.Call[](3);
        calls[0] = ERC7821Lib.makeCall(recipient1, amount1, "");
        calls[1] = ERC7821Lib.makeCall(recipient2, amount2, "");
        calls[2] = ERC7821Lib.makeCall(recipient3, amount3, "");

        _executeBatch(appClient, calls);

        assertEq(recipient1.balance, amount1);
        assertEq(recipient2.balance, amount2);
        assertEq(recipient3.balance, amount3);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*           EXECUTE - COORDINATOR AUTHORIZATION              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_execute_coordinatorCanExecute() external givenSimpleAppIsCreatedAndInstalled {
        address coordinator = _getCoordinator();
        address recipient = _randomAddress();

        _sendNativeToken(coordinator, recipient, SIMPLE_APP_INSTALL_PRICE);

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    function test_execute_coordinatorCanSendETH() external givenSimpleAppIsCreatedAndInstalled {
        address coordinator = _getCoordinator();
        address recipient = _randomAddress();
        uint256 amount = 0.5 ether;

        _sendNativeToken(coordinator, recipient, amount);

        assertEq(recipient.balance, amount);
    }

    function test_execute_coordinatorCanExecuteBatch()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        address coordinator = _getCoordinator();
        address recipient1 = _randomAddress();
        address recipient2 = _randomAddress();

        uint256 amount1 = 0.4 ether;
        uint256 amount2 = 0.6 ether;

        ERC7821.Call[] memory calls = new ERC7821.Call[](2);
        calls[0] = ERC7821Lib.makeCall(recipient1, amount1, "");
        calls[1] = ERC7821Lib.makeCall(recipient2, amount2, "");

        _executeBatch(coordinator, calls);

        assertEq(recipient1.balance, amount1);
        assertEq(recipient2.balance, amount2);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*           EXECUTE - ENTRYPOINT AUTHORIZATION               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_execute_entryPointCanExecute() external givenSimpleAppIsCreatedAndInstalled {
        address entrypoint = _getEntryPoint();
        address recipient = _randomAddress();

        _sendNativeToken(entrypoint, recipient, SIMPLE_APP_INSTALL_PRICE);

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    function test_execute_entryPointCanSendETH() external givenSimpleAppIsCreatedAndInstalled {
        address entrypoint = _getEntryPoint();
        address recipient = _randomAddress();
        uint256 amount = 0.7 ether;

        _sendNativeToken(entrypoint, recipient, amount);

        assertEq(recipient.balance, amount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              EXECUTE - SELF AUTHORIZATION                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_execute_selfCanExecute() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        _sendNativeToken(SIMPLE_APP, recipient, SIMPLE_APP_INSTALL_PRICE);

        assertEq(recipient.balance, SIMPLE_APP_INSTALL_PRICE);
        assertEq(address(SIMPLE_APP).balance, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 EXECUTE - REVERTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_execute_unauthorizedCaller()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        address unauthorized = _randomAddress();
        address recipient = _randomAddress();

        vm.expectRevert(SimpleAccount__NotFromTrustedCaller.selector);
        _sendNativeToken(unauthorized, recipient, SIMPLE_APP_INSTALL_PRICE);
    }

    function test_revertWhen_execute_withOpData() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        ERC7821.Call[] memory calls = new ERC7821.Call[](1);
        calls[0] = ERC7821Lib.makeCall(recipient, 0.5 ether, "");
        bytes memory opData = abi.encode("some operation data");

        (bool success, ) = _executeWithOpData(appDeveloper, calls, opData);

        assertEq(success, false);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   OWNER-ONLY FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_withdrawETH() external givenSimpleAppIsCreatedAndInstalled {
        vm.prank(appDeveloper);
        SimpleAppFacet(payable(SIMPLE_APP)).withdrawETH(appDeveloper);
        assertEq(appDeveloper.balance, SIMPLE_APP_INSTALL_PRICE);
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              OWNER-ONLY FUNCTIONS - REVERTS                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_revertWhen_withdrawETH_callerNotOwner()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, appClient));
        vm.prank(appClient);
        SimpleAppFacet(payable(SIMPLE_APP)).withdrawETH(appDeveloper);
    }

    function test_revertWhen_updatePricing_callerNotOwner()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, appClient));
        vm.prank(appClient);
        SimpleAppFacet(payable(SIMPLE_APP)).updatePricing(SIMPLE_APP_INSTALL_PRICE + 1, 366 days);
    }

    function test_revertWhen_updatePermissions_callerNotOwner()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, appClient));
        vm.prank(appClient);
        SimpleAppFacet(payable(SIMPLE_APP)).updatePermissions(new bytes32[](2));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*               ERC-4337 USEROP VALIDATION                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_validateUserOp_ownerSignature() external givenSimpleAppIsCreatedAndInstalled {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");
        PackedUserOperation memory userOp = _createUserOp(SIMPLE_APP, 0, callData);
        userOp = _signUserOp(userOp, appDeveloperPrivateKey);

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        vm.prank(_getEntryPoint());
        uint256 validationData = SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(
            userOp,
            userOpHash,
            0
        );

        assertEq(validationData, 0);
    }

    function test_validateUserOp_clientSignature() external givenSimpleAppIsCreatedAndInstalled {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");
        PackedUserOperation memory userOp = _createUserOp(SIMPLE_APP, 0, callData);
        userOp = _signUserOp(userOp, appClientPrivateKey);

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        vm.prank(_getEntryPoint());
        uint256 validationData = SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(
            userOp,
            userOpHash,
            0
        );

        assertEq(validationData, 0);
    }

    function test_validateUserOp_paysPreFund() external givenSimpleAppIsCreatedAndInstalled {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");
        PackedUserOperation memory userOp = _createUserOp(SIMPLE_APP, 0, callData);
        userOp = _signUserOp(userOp, appDeveloperPrivateKey);

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);
        uint256 missingFunds = 0.05 ether;

        uint256 entryPointBalanceBefore = _getEntryPoint().balance;

        vm.prank(_getEntryPoint());
        SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(userOp, userOpHash, missingFunds);

        assertEq(_getEntryPoint().balance, entryPointBalanceBefore + missingFunds);
    }

    function test_validateUserOp_validatesNonce() external givenSimpleAppIsCreatedAndInstalled {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");
        PackedUserOperation memory userOp = _createUserOp(SIMPLE_APP, 0, callData);
        userOp = _signUserOp(userOp, appDeveloperPrivateKey);

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        vm.prank(_getEntryPoint());
        uint256 validationData = SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(
            userOp,
            userOpHash,
            0
        );

        assertEq(validationData, 0);
    }

    function test_revertWhen_validateUserOp_callerNotEntryPoint()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");
        PackedUserOperation memory userOp = _createUserOp(SIMPLE_APP, 0, callData);
        userOp = _signUserOp(userOp, appDeveloperPrivateKey);

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        vm.expectRevert();
        SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(userOp, userOpHash, 0);
    }

    function test_revertWhen_validateUserOp_malformedSignature()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");
        PackedUserOperation memory userOp = _createUserOp(SIMPLE_APP, 0, callData);
        // Empty signature causes revert in ECDSA recovery
        userOp.signature = "";

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        vm.prank(_getEntryPoint());
        vm.expectRevert();
        SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(userOp, userOpHash, 0);
    }

    function test_revertWhen_validateUserOp_unauthorizedSigner()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");
        PackedUserOperation memory userOp = _createUserOp(SIMPLE_APP, 0, callData);
        uint256 wrongKey = _createWrongPrivateKey();
        userOp = _signUserOp(userOp, wrongKey);

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        vm.prank(_getEntryPoint());
        uint256 validationData = SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(
            userOp,
            userOpHash,
            0
        );

        assertEq(validationData, 1);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*            ERC-1271 SIGNATURE VALIDATION                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_isValidSignature_ownerSignature() external givenSimpleAppIsCreatedAndInstalled {
        bytes32 messageHash = keccak256("Test message");
        bytes memory signature = _createPersonalSignature(
            appDeveloperPrivateKey,
            messageHash,
            SIMPLE_APP
        );

        bytes4 result = SimpleAppFacet(payable(SIMPLE_APP)).isValidSignature(
            messageHash,
            signature
        );

        assertEq(result, ERC1271_MAGIC_VALUE);
    }

    function test_isValidSignature_clientSignature() external givenSimpleAppIsCreatedAndInstalled {
        bytes32 messageHash = keccak256("Test message");
        bytes memory signature = _createPersonalSignature(
            appClientPrivateKey,
            messageHash,
            SIMPLE_APP
        );

        bytes4 result = SimpleAppFacet(payable(SIMPLE_APP)).isValidSignature(
            messageHash,
            signature
        );

        assertEq(result, ERC1271_MAGIC_VALUE);
    }

    function test_isValidSignature_invalidSignature() external givenSimpleAppIsCreatedAndInstalled {
        bytes32 messageHash = keccak256("Test message");
        bytes memory invalidSignature = abi.encodePacked(bytes32(0), bytes32(0), bytes1(0));

        bytes4 result = SimpleAppFacet(payable(SIMPLE_APP)).isValidSignature(
            messageHash,
            invalidSignature
        );

        assertEq(result, INVALID_SIGNATURE);
    }

    function test_isValidSignature_unauthorizedSigner()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        bytes32 messageHash = keccak256("Test message");
        uint256 wrongKey = _createWrongPrivateKey();
        bytes memory signature = _createPersonalSignature(wrongKey, messageHash, SIMPLE_APP);

        bytes4 result = SimpleAppFacet(payable(SIMPLE_APP)).isValidSignature(
            messageHash,
            signature
        );

        assertEq(result, INVALID_SIGNATURE);
    }

    function test_isValidSignature_differentMessageHash()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        bytes32 messageHash1 = keccak256("Message 1");
        bytes32 messageHash2 = keccak256("Message 2");

        bytes memory signature1 = _createPersonalSignature(
            appDeveloperPrivateKey,
            messageHash1,
            SIMPLE_APP
        );

        // Signature for message1 should not validate message2
        bytes4 result = SimpleAppFacet(payable(SIMPLE_APP)).isValidSignature(
            messageHash2,
            signature1
        );

        assertEq(result, INVALID_SIGNATURE);
    }

    function test_isValidSignature_replayProtection() external givenSimpleAppIsCreatedAndInstalled {
        bytes32 messageHash = keccak256("Test message");
        bytes memory signature = _createPersonalSignature(
            appDeveloperPrivateKey,
            messageHash,
            SIMPLE_APP
        );

        // First validation should succeed
        bytes4 result1 = SimpleAppFacet(payable(SIMPLE_APP)).isValidSignature(
            messageHash,
            signature
        );
        assertEq(result1, ERC1271_MAGIC_VALUE);

        // Same signature should still be valid (no nonce in ERC-1271)
        bytes4 result2 = SimpleAppFacet(payable(SIMPLE_APP)).isValidSignature(
            messageHash,
            signature
        );
        assertEq(result2, ERC1271_MAGIC_VALUE);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    EIP-712 DOMAIN                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_domainSeparator_matchesEIP712() external givenSimpleAppIsCreatedAndInstalled {
        EIP712Facet eip712 = EIP712Facet(SIMPLE_APP);
        bytes32 domainSeparator = eip712.DOMAIN_SEPARATOR();

        // Domain separator should be non-zero
        assertTrue(domainSeparator != bytes32(0));

        // Should be consistent across calls
        assertEq(domainSeparator, eip712.DOMAIN_SEPARATOR());
    }

    function test_eip712Domain_returnsCorrectFields() external givenSimpleAppIsCreatedAndInstalled {
        EIP712Facet eip712 = EIP712Facet(SIMPLE_APP);

        (
            ,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            ,

        ) = eip712.eip712Domain();

        // Verify contract address is correct
        assertEq(verifyingContract, SIMPLE_APP);

        // Verify chain ID matches current chain
        assertEq(chainId, block.chainid);

        // Name and version should be non-empty
        assertTrue(bytes(name).length > 0);
        assertTrue(bytes(version).length > 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   MODULE INTERFACE                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_moduleId_returnsCorrectId() external givenSimpleAppIsCreatedAndInstalled {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));
        assertEq(app.moduleId(), "simple.app");
    }

    function test_moduleOwner_returnsOwner() external givenSimpleAppIsCreatedAndInstalled {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));
        assertEq(app.moduleOwner(), appDeveloper);
    }

    function test_requiredPermissions_returnsPermissions()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));
        bytes32[] memory permissions = app.requiredPermissions();

        assertEq(permissions.length, 1);
        assertEq(permissions[0], bytes32("Read"));
    }

    function test_supportsInterface_allInterfaces() external givenSimpleAppIsCreatedAndInstalled {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));

        // Module interfaces
        assertTrue(app.supportsInterface(type(IModule).interfaceId));
        assertTrue(app.supportsInterface(type(ISimpleApp).interfaceId));

        // Account abstraction
        assertTrue(app.supportsInterface(type(IAccount).interfaceId));

        // EIP standards
        assertTrue(app.supportsInterface(type(IERC165).interfaceId));
        assertTrue(app.supportsInterface(type(IERC5267).interfaceId));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*               TOKEN RECEIVER INTERFACES                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onERC721Received_acceptsTokens() external givenSimpleAppIsCreatedAndInstalled {
        MockERC721 nft = new MockERC721();

        // Mint directly to app using safeMint
        uint256 tokenId = nft.safeMint(SIMPLE_APP);

        // Verify app received the token
        assertEq(nft.ownerOf(tokenId), SIMPLE_APP);
    }

    function test_onERC1155Received_acceptsSingleToken()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        MockERC1155 token = new MockERC1155();
        uint256 tokenId = 1;
        uint256 amount = 10;

        // Mint directly to app
        token.safeMint(SIMPLE_APP, tokenId, amount);

        // Verify app received the tokens
        assertEq(token.balanceOf(SIMPLE_APP, tokenId), amount);
    }

    function test_onERC1155BatchReceived_acceptsBatchTokens()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        MockERC1155 token = new MockERC1155();

        uint256[] memory ids = new uint256[](3);
        ids[0] = 1;
        ids[1] = 2;
        ids[2] = 3;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 10;
        amounts[1] = 20;
        amounts[2] = 30;

        // Mint batch directly to app
        token.safeMintBatch(SIMPLE_APP, ids, amounts);

        // Verify app received all tokens
        assertEq(token.balanceOf(SIMPLE_APP, ids[0]), amounts[0]);
        assertEq(token.balanceOf(SIMPLE_APP, ids[1]), amounts[1]);
        assertEq(token.balanceOf(SIMPLE_APP, ids[2]), amounts[2]);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EVENTS                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_withdrawETH_emitsEvent() external givenSimpleAppIsCreatedAndInstalled {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));

        vm.expectEmit(true, false, false, true, SIMPLE_APP);
        emit Withdrawal(appDeveloper, SIMPLE_APP_INSTALL_PRICE);

        vm.prank(appDeveloper);
        app.withdrawETH(appDeveloper);
    }

    function test_updatePricing_emitsEvent() external givenSimpleAppIsCreatedAndInstalled {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));
        uint256 newPrice = SIMPLE_APP_INSTALL_PRICE + 1;
        uint48 newDuration = 366 days;

        vm.expectEmit(false, false, false, true, SIMPLE_APP);
        emit PricingUpdated(newPrice, newDuration);

        vm.prank(appDeveloper);
        app.updatePricing(newPrice, newDuration);
    }

    function test_updatePermissions_emitsEvent() external givenSimpleAppIsCreatedAndInstalled {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));
        bytes32[] memory newPermissions = new bytes32[](2);
        newPermissions[0] = bytes32("Read");
        newPermissions[1] = bytes32("Write");

        vm.expectEmit(false, false, false, true, SIMPLE_APP);
        emit PermissionsUpdated(newPermissions);

        vm.prank(appDeveloper);
        app.updatePermissions(newPermissions);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  ADDITIONAL COVERAGE                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_withdrawETH_transfersFullBalance() external givenSimpleAppIsCreatedAndInstalled {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));
        uint256 initialBalance = SIMPLE_APP_INSTALL_PRICE;

        // Add extra ETH to the app
        vm.deal(SIMPLE_APP, initialBalance + 2 ether);
        uint256 totalBalance = SIMPLE_APP.balance;

        uint256 recipientBalanceBefore = appDeveloper.balance;

        vm.prank(appDeveloper);
        app.withdrawETH(appDeveloper);

        assertEq(SIMPLE_APP.balance, 0);
        assertEq(appDeveloper.balance, recipientBalanceBefore + totalBalance);
    }

    function test_revertWhen_withdrawETH_zeroBalance() external {
        // Create app without installing (no balance)
        _createSimpleApp(appDeveloper, appClient);

        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));

        vm.expectRevert(SimpleApp__NoBalanceToWithdraw.selector);
        vm.prank(appDeveloper);
        app.withdrawETH(appDeveloper);
    }

    function test_installPrice_returnsCorrectPrice() external givenSimpleAppIsCreatedAndInstalled {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));
        assertEq(app.installPrice(), SIMPLE_APP_INSTALL_PRICE);
    }

    function test_accessDuration_returnsCorrectDuration()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        SimpleAppFacet app = SimpleAppFacet(payable(SIMPLE_APP));
        assertEq(app.accessDuration(), 365 days);
    }

    function test_validateUserOp_handlesNonceCorrectly()
        external
        givenSimpleAppIsCreatedAndInstalled
    {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");

        // Create userOp with nonce 0
        PackedUserOperation memory userOp1 = _createUserOp(SIMPLE_APP, 0, callData);
        userOp1 = _signUserOp(userOp1, appDeveloperPrivateKey);

        bytes32 userOpHash1 = entryPoint.getUserOpHash(userOp1);

        vm.prank(_getEntryPoint());
        uint256 validationData1 = SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(
            userOp1,
            userOpHash1,
            0
        );

        assertEq(validationData1, 0);

        // Create userOp with nonce 1
        PackedUserOperation memory userOp2 = _createUserOp(SIMPLE_APP, 1, callData);
        userOp2 = _signUserOp(userOp2, appDeveloperPrivateKey);

        bytes32 userOpHash2 = entryPoint.getUserOpHash(userOp2);

        vm.prank(_getEntryPoint());
        uint256 validationData2 = SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(
            userOp2,
            userOpHash2,
            0
        );

        assertEq(validationData2, 0);
    }

    function test_validateUserOp_zeroMissingFunds() external givenSimpleAppIsCreatedAndInstalled {
        bytes memory callData = _encodeExecute(_randomAddress(), 0.1 ether, "");
        PackedUserOperation memory userOp = _createUserOp(SIMPLE_APP, 0, callData);
        userOp = _signUserOp(userOp, appDeveloperPrivateKey);

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);

        uint256 entryPointBalanceBefore = _getEntryPoint().balance;

        vm.prank(_getEntryPoint());
        uint256 validationData = SimpleAppFacet(payable(SIMPLE_APP)).validateUserOp(
            userOp,
            userOpHash,
            0
        );

        assertEq(validationData, 0);
        assertEq(_getEntryPoint().balance, entryPointBalanceBefore);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   GAS OPTIMIZATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_execute_gasEfficient() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();
        uint256 amount = 0.5 ether;

        uint256 gasBefore = gasleft();
        _sendNativeToken(appDeveloper, recipient, amount);
        uint256 gasUsed = gasBefore - gasleft();

        // Verify execution succeeded
        assertEq(recipient.balance, amount);

        // Gas should be reasonable (less than 100k for simple transfer)
        assertLt(gasUsed, 100000);
    }

    function test_executeBatch_gasEfficient() external givenSimpleAppIsCreatedAndInstalled {
        address recipient1 = _randomAddress();
        address recipient2 = _randomAddress();
        address recipient3 = _randomAddress();

        uint256 amount = 0.3 ether;

        ERC7821.Call[] memory calls = new ERC7821.Call[](3);
        calls[0] = ERC7821Lib.makeCall(recipient1, amount, "");
        calls[1] = ERC7821Lib.makeCall(recipient2, amount, "");
        calls[2] = ERC7821Lib.makeCall(recipient3, amount, "");

        uint256 gasBefore = gasleft();
        _executeBatch(appDeveloper, calls);
        uint256 gasUsed = gasBefore - gasleft();

        // Verify all executions succeeded
        assertEq(recipient1.balance, amount);
        assertEq(recipient2.balance, amount);
        assertEq(recipient3.balance, amount);

        // Batch should be more efficient than 3 separate calls (less than 150k)
        assertLt(gasUsed, 150000);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 REENTRANCY PROTECTION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_execute_reentrancyProtection() external givenSimpleAppIsCreatedAndInstalled {
        MockReentrant attacker = new MockReentrant(SIMPLE_APP);

        // Enable reentrancy - attacker will try to reenter when it receives ETH
        attacker.enableReentrancy();

        // Send ETH to the attacker contract
        // If reentrancy is prevented, it should receive exactly 0.5 ether
        // If reentrancy succeeds, it would drain more
        _sendNativeToken(appDeveloper, address(attacker), 0.5 ether);

        // Verify only the intended amount was transferred (reentrancy was prevented)
        assertEq(address(attacker).balance, 0.5 ether);
        // App should still have balance remaining
        assertGt(SIMPLE_APP.balance, 0);
    }

    function test_withdrawETH_reentrancyProtection() external {
        // Create a separate app with attacker as owner
        address attackerOwner = _randomAddress();
        _createSimpleApp(attackerOwner, appClient);
        address attackerApp = SIMPLE_APP;

        // Install to give it balance
        _installSimpleApp(attackerApp);

        MockReentrant attacker = new MockReentrant(attackerApp);
        attacker.enableReentrancy();

        SimpleAppFacet app = SimpleAppFacet(payable(attackerApp));
        uint256 balance = attackerApp.balance;

        // Owner tries to withdraw to attacker contract (which will attempt reentrancy)
        vm.prank(attackerOwner);
        app.withdrawETH(address(attacker));

        // Should have withdrawn exactly once (reentrancy protection worked)
        assertEq(attackerApp.balance, 0);
        assertEq(address(attacker).balance, balance);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*               COMPLEX BATCH EXECUTION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeBatch_largeNumberOfCalls() external givenSimpleAppIsCreatedAndInstalled {
        uint256 numCalls = 10;
        ERC7821.Call[] memory calls = new ERC7821.Call[](numCalls);

        address[] memory recipients = new address[](numCalls);
        uint256 amount = 0.1 ether;

        for (uint256 i = 0; i < numCalls; i++) {
            recipients[i] = _randomAddress();
            calls[i] = ERC7821Lib.makeCall(recipients[i], amount, "");
        }

        _executeBatch(appDeveloper, calls);

        // Verify all recipients received their ETH
        for (uint256 i = 0; i < numCalls; i++) {
            assertEq(recipients[i].balance, amount);
        }
    }

    function test_executeBatch_mixedValueCalls() external givenSimpleAppIsCreatedAndInstalled {
        address recipient1 = _randomAddress();
        address recipient2 = _randomAddress();
        address recipient3 = _randomAddress();

        uint256 amount1 = 0.1 ether;
        uint256 amount2 = 0; // Zero value call
        uint256 amount3 = 0.9 ether;

        ERC7821.Call[] memory calls = new ERC7821.Call[](3);
        calls[0] = ERC7821Lib.makeCall(recipient1, amount1, "");
        calls[1] = ERC7821Lib.makeCall(recipient2, amount2, "");
        calls[2] = ERC7821Lib.makeCall(recipient3, amount3, "");

        _executeBatch(appDeveloper, calls);

        assertEq(recipient1.balance, amount1);
        assertEq(recipient2.balance, amount2);
        assertEq(recipient3.balance, amount3);
    }

    function test_executeBatch_failureHandling() external givenSimpleAppIsCreatedAndInstalled {
        address recipient1 = _randomAddress();
        address recipient2 = _randomAddress();

        // Create a batch where one call will fail (insufficient balance)
        ERC7821.Call[] memory calls = new ERC7821.Call[](2);
        calls[0] = ERC7821Lib.makeCall(recipient1, 0.5 ether, "");
        calls[1] = ERC7821Lib.makeCall(recipient2, 100 ether, ""); // This will fail

        // The entire batch should revert
        vm.expectRevert();
        _executeBatch(appDeveloper, calls);

        // Neither recipient should have received ETH
        assertEq(recipient1.balance, 0);
        assertEq(recipient2.balance, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   FALLBACK & RECEIVE                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_receive_acceptsETH() external givenSimpleAppIsCreatedAndInstalled {
        uint256 balanceBefore = SIMPLE_APP.balance;
        uint256 sendAmount = 1 ether;

        // Send ETH directly to the contract via receive()
        (bool success, ) = SIMPLE_APP.call{value: sendAmount}("");

        assertTrue(success);
        assertEq(SIMPLE_APP.balance, balanceBefore + sendAmount);
    }

    function test_fallback_revertsOnUnknownSelector() external givenSimpleAppIsCreatedAndInstalled {
        // Call with an unknown function selector
        bytes memory data = abi.encodeWithSignature("nonExistentFunction()");

        (bool success, bytes memory returnData) = SIMPLE_APP.call(data);

        // For a Diamond proxy, unknown selectors will revert or return empty
        // Either way, the call should fail or return no data
        if (success) {
            // If it succeeded, it should have no return data (fallback did nothing)
            assertEq(returnData.length, 0);
        } else {
            // If it reverted, that's the expected behavior
            assertFalse(success);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      EDGE CASES                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_execute_maxValueTransfer() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();
        uint256 maxTransfer = SIMPLE_APP.balance; // All available balance

        _sendNativeToken(appDeveloper, recipient, maxTransfer);

        assertEq(recipient.balance, maxTransfer);
        assertEq(SIMPLE_APP.balance, 0);
    }

    function test_execute_emptyCalldata() external givenSimpleAppIsCreatedAndInstalled {
        address recipient = _randomAddress();

        // Execute with empty calldata
        ERC7821.Call[] memory calls = new ERC7821.Call[](1);
        calls[0] = ERC7821Lib.makeCall(recipient, 0.5 ether, ""); // Empty calldata

        _executeBatch(appDeveloper, calls);

        assertEq(recipient.balance, 0.5 ether);
    }

    function test_initialize_edgeCaseValues() external {
        // Create app with edge case values
        bytes32[] memory minimalPermissions = new bytes32[](1);
        minimalPermissions[0] = bytes32("Min"); // Minimal permission
        address randomClient = _randomAddress();

        AppParams memory appData = AppParams({
            name: "edge.app",
            permissions: minimalPermissions,
            client: randomClient,
            installPrice: 0, // Free app
            accessDuration: 1 days // Minimum duration
        });

        vm.prank(appDeveloper);
        (address app, ) = factory.createApp(appData);

        SimpleAppFacet simpleApp = SimpleAppFacet(payable(app));

        assertEq(simpleApp.moduleId(), "edge.app");
        assertEq(simpleApp.installPrice(), 0);
        assertEq(simpleApp.accessDuration(), 1 days);
        assertEq(simpleApp.requiredPermissions().length, 1);
        assertEq(simpleApp.requiredPermissions()[0], bytes32("Min"));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INTEGRATION                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_fullWorkflow_createInstallExecute() external {
        // Step 1: Create app
        _createSimpleApp(appDeveloper, appClient);
        assertGt(SIMPLE_APP.code.length, 0);

        // Step 2: Install app
        _installSimpleApp(SIMPLE_APP);
        assertGt(SIMPLE_APP.balance, 0);

        // Step 3: Execute as owner
        address recipient = _randomAddress();
        _sendNativeToken(appDeveloper, recipient, 0.5 ether);
        assertEq(recipient.balance, 0.5 ether);

        // Step 4: Update pricing
        vm.prank(appDeveloper);
        SimpleAppFacet(payable(SIMPLE_APP)).updatePricing(2 ether, 180 days);
        assertEq(SimpleAppFacet(payable(SIMPLE_APP)).installPrice(), 2 ether);

        // Step 5: Withdraw remaining balance
        vm.prank(appDeveloper);
        SimpleAppFacet(payable(SIMPLE_APP)).withdrawETH(appDeveloper);
        assertEq(SIMPLE_APP.balance, 0);
    }

    function test_multipleApps_sameOwner() external {
        // Create first app
        _createSimpleApp(appDeveloper, appClient);
        address app1 = SIMPLE_APP;

        // Create second app with different client
        address secondClient = _randomAddress();
        (address app2, ) = _createSecondApp(appDeveloper, secondClient);

        // Install both apps
        _installSimpleApp(app1);
        _installSimpleApp(app2);

        // Verify both have independent state
        SimpleAppFacet facet1 = SimpleAppFacet(payable(app1));
        SimpleAppFacet facet2 = SimpleAppFacet(payable(app2));

        assertEq(facet1.moduleOwner(), appDeveloper);
        assertEq(facet2.moduleOwner(), appDeveloper);
        assertEq(facet1.installPrice(), SIMPLE_APP_INSTALL_PRICE);
        assertEq(facet2.installPrice(), SIMPLE_APP_INSTALL_PRICE * 2);
        assertEq(facet1.accessDuration(), 365 days);
        assertEq(facet2.accessDuration(), 180 days);

        // Owner can control both independently
        address recipient1 = _randomAddress();
        address recipient2 = _randomAddress();

        vm.prank(appDeveloper);
        (bool success1, ) = app1.call(_encodeExecute(recipient1, 0.3 ether, ""));
        assertTrue(success1);

        vm.prank(appDeveloper);
        (bool success2, ) = app2.call(_encodeExecute(recipient2, 0.4 ether, ""));
        assertTrue(success2);

        assertEq(recipient1.balance, 0.3 ether);
        assertEq(recipient2.balance, 0.4 ether);
    }

    function test_crossAppInteraction() external {
        // Create two apps
        _createSimpleApp(appDeveloper, appClient);
        address app1 = SIMPLE_APP;
        _installSimpleApp(app1);

        address secondClient = _randomAddress();
        (address app2, ) = _createSecondApp(appDeveloper, secondClient);
        _installSimpleApp(app2);

        // App1 can send ETH to App2
        uint256 transferAmount = 0.5 ether;

        vm.prank(appDeveloper);
        (bool success, ) = app1.call(_encodeExecute(app2, transferAmount, ""));
        assertTrue(success);

        // Verify App2 received the ETH
        assertGt(app2.balance, 0);

        // App2 owner can now use that ETH
        address recipient = _randomAddress();
        vm.prank(appDeveloper);
        (bool success2, ) = app2.call(_encodeExecute(recipient, transferAmount, ""));
        assertTrue(success2);

        assertEq(recipient.balance, transferAmount);
    }
}
