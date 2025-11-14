// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppFactoryBase} from "../../../src/apps/facets/factory/IAppFactory.sol";
import {ISimpleApp, ISimpleAppBase} from "../../../src/apps/simple/app/ISimpleApp.sol";
import {ITownsApp} from "../../../src/apps/ITownsApp.sol";
import {ISimpleAccount, ISimpleAccountBase} from "../../../src/apps/simple/account/ISimpleAccount.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {IERC5267} from "@openzeppelin/contracts/interfaces/IERC5267.sol";
import {IAccount} from "@eth-infinitism/account-abstraction/interfaces/IAccount.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IERC7821} from "@openzeppelin/contracts/interfaces/draft-IERC7821.sol";

// libraries
import {ERC7821Lib} from "./ERC7821Lib.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {PackedUserOperation} from "@eth-infinitism/account-abstraction/interfaces/PackedUserOperation.sol";

// contracts
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {AppFactoryFacet} from "../../../src/apps/facets/factory/AppFactoryFacet.sol";
import {AppInstallerFacet} from "../../../src/apps/facets/installer/AppInstallerFacet.sol";
import {AppRegistryFacet} from "../../../src/apps/facets/registry/AppRegistryFacet.sol";
import {AppAccount} from "../../../src/spaces/facets/account/AppAccount.sol";
import {SimpleAppFacet} from "../../../src/apps/simple/app/SimpleAppFacet.sol";
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";
import {ERC7821} from "solady/accounts/ERC7821.sol";

abstract contract SimpleAppBaseTest is
    BaseSetup,
    IAppFactoryBase,
    ISimpleAppBase,
    ISimpleAccountBase
{
    using ERC7821Lib for *;

    AppFactoryFacet internal factory;
    AppInstallerFacet internal installer;
    AppRegistryFacet internal registry;
    AppAccount internal appAccount;

    address internal SIMPLE_APP;
    bytes32 internal SIMPLE_APP_ID;
    uint256 internal SIMPLE_APP_INSTALL_PRICE = 1 ether;

    // EIP712 Type Hashes
    bytes32 private constant PERSONAL_SIGN_TYPEHASH = keccak256("PersonalSign(bytes prefixed)");
    bytes4 private constant ERC1271_MAGIC_VALUE = 0x1626ba7e;
    bytes4 private constant INVALID_SIGNATURE = 0xffffffff;

    function setUp() public override {
        super.setUp();
        factory = AppFactoryFacet(appRegistry);
        installer = AppInstallerFacet(appRegistry);
        registry = AppRegistryFacet(appRegistry);
        appAccount = AppAccount(everyoneSpace);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        MODIFIERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier givenSimpleAppIsCreatedAndInstalled() {
        _createSimpleApp(appDeveloper, appClient);
        _installSimpleApp(SIMPLE_APP);
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SETUP HELPERS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _installSimpleApp(address app) internal {
        uint256 totalRequired = registry.getAppPrice(app);
        hoax(founder, totalRequired);
        installer.installApp{value: totalRequired}(ITownsApp(app), appAccount, "");
    }

    function _createSimpleApp(address _dev, address _client) internal {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: _client,
            installPrice: SIMPLE_APP_INSTALL_PRICE,
            accessDuration: 365 days
        });

        vm.prank(_dev);
        (SIMPLE_APP, SIMPLE_APP_ID) = factory.createApp(appData);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   INITIALIZATION HELPERS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getCoordinator() internal view returns (address) {
        return address(factory);
    }

    function _checkAllInterfaces(address app) internal view {
        SimpleAppFacet facet = SimpleAppFacet(payable(app));
        assertEq(facet.supportsInterface(type(ISimpleApp).interfaceId), true);
        assertEq(facet.supportsInterface(type(ITownsApp).interfaceId), true);
        assertEq(facet.supportsInterface(type(IModule).interfaceId), true);
        assertEq(facet.supportsInterface(type(IExecutionModule).interfaceId), true);
        assertEq(facet.supportsInterface(type(IAccount).interfaceId), true);
        assertEq(facet.supportsInterface(type(IERC721Receiver).interfaceId), true);
        assertEq(facet.supportsInterface(type(IERC1155Receiver).interfaceId), true);
        assertEq(facet.supportsInterface(type(IERC5267).interfaceId), true);
        assertEq(facet.supportsInterface(type(IERC7821).interfaceId), true);
        assertEq(facet.supportsInterface(type(IERC1271).interfaceId), true);
        assertEq(facet.supportsInterface(type(IERC165).interfaceId), true);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     EXECUTE HELPERS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _encodeExecute(
        address to,
        uint256 value,
        bytes memory data
    ) internal pure returns (bytes memory) {
        return ERC7821Lib.encodeExecuteSingle(to, value, data);
    }

    function _sendNativeToken(address from, address to, uint256 amount) internal {
        vm.prank(from);
        (bool success, ) = SIMPLE_APP.call(_encodeExecute(to, amount, ""));
        require(success, "Execute failed");
    }

    function _executeBatch(
        address from,
        ERC7821.Call[] memory calls
    ) internal returns (bytes memory) {
        bytes memory executionData = ERC7821Lib.encodeExecute(calls);
        vm.prank(from);
        (bool success, bytes memory result) = SIMPLE_APP.call(executionData);
        require(success, "Batch execute failed");
        return result;
    }

    function _executeWithOpData(
        address from,
        ERC7821.Call[] memory calls,
        bytes memory opData
    ) internal returns (bool success, bytes memory result) {
        bytes memory executionData = ERC7821Lib.encodeExecuteWithOpData(calls, opData);
        vm.prank(from);
        return SIMPLE_APP.call(executionData);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  ERC-1271 SIGNATURE HELPERS                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createPersonalSignature(
        uint256 privateKey,
        bytes32 messageHash,
        address validator
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(PERSONAL_SIGN_TYPEHASH, messageHash));
        bytes32 domainSeparator = EIP712Facet(validator).DOMAIN_SEPARATOR();
        bytes32 finalHash = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, finalHash);
        return abi.encodePacked(r, s, v);
    }

    function _signMessageHash(
        uint256 privateKey,
        bytes32 messageHash
    ) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, messageHash);
        return abi.encodePacked(r, s, v);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 ERC-4337 USEROP HELPERS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createUserOp(
        address sender,
        uint256 nonce,
        bytes memory callData
    ) internal pure returns (PackedUserOperation memory userOp) {
        userOp = PackedUserOperation({
            sender: sender,
            nonce: nonce,
            initCode: "",
            callData: callData,
            accountGasLimits: bytes32(abi.encodePacked(uint128(200000), uint128(200000))),
            preVerificationGas: 50000,
            gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei))),
            paymasterAndData: "",
            signature: ""
        });
    }

    function _signUserOp(
        PackedUserOperation memory userOp,
        uint256 privateKey
    ) internal view returns (PackedUserOperation memory) {
        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, userOpHash);
        userOp.signature = abi.encodePacked(r, s, v);
        return userOp;
    }

    function _getEntryPoint() internal view returns (address) {
        return factory.getEntryPoint();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      TEST UTILITIES                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createWrongPrivateKey() internal view returns (uint256 wrongPrivateKey) {
        wrongPrivateKey = boundPrivateKey(_randomUint256());
        require(wrongPrivateKey != founderPrivateKey, "Wrong key matches signer key");
    }

    function _createSecondApp(
        address _dev,
        address _client
    ) internal returns (address app, bytes32 appId) {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Write");
        AppParams memory appData = AppParams({
            name: "simple.app.v2",
            permissions: permissions,
            client: _client,
            installPrice: SIMPLE_APP_INSTALL_PRICE * 2,
            accessDuration: 180 days
        });

        vm.prank(_dev);
        (app, appId) = factory.createApp(appData);
    }
}

/// @notice Mock contract for reentrancy testing
contract MockReentrant {
    address public target;
    bool public shouldReenter;
    uint256 public receiveCount;

    constructor(address _target) {
        target = _target;
    }

    function enableReentrancy() external {
        shouldReenter = true;
    }

    function disableReentrancy() external {
        shouldReenter = false;
    }

    receive() external payable {
        receiveCount++;
        if (shouldReenter && receiveCount == 1 && address(target).balance > 0) {
            // Attempt to reenter by calling withdrawETH
            // This should fail due to reentrancy protection
            try SimpleAppFacet(payable(target)).withdrawETH(address(this)) {
                // Reentrancy succeeded (bad)
            } catch {
                // Reentrancy prevented (good)
            }
        }
    }
}
