// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

// interfaces
import {IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";
import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";

// libraries
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {SignerFacet} from "src/spaces/facets/account/SignerFacet.sol";

// Mocks
import {MockModule} from "test/mocks/MockModule.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract SignerFacetTest is BaseSetup {
    SignerFacet internal signerFacet;
    AppRegistryFacet internal registry;
    AppAccount internal appAccount;

    bytes32 internal appId;

    // EIP712 Type Hashes
    bytes32 private constant PERSONAL_SIGN_TYPEHASH = keccak256("PersonalSign(bytes prefixed)");
    bytes4 private constant ERC1271_MAGIC_VALUE = 0x1626ba7e;
    bytes4 private constant INVALID_SIGNATURE = 0xffffffff;

    address dev = makeAddr("dev");
    address client = makeAddr("client");
    MockModule mockModule;

    function setUp() public override {
        super.setUp();
        signerFacet = SignerFacet(everyoneSpace);
        appAccount = AppAccount(everyoneSpace);
        registry = AppRegistryFacet(appRegistry);

        address mockModuleV1 = address(new MockModule());

        vm.prank(dev);
        mockModule = MockModule(
            address(
                new ERC1967Proxy(
                    address(mockModuleV1),
                    abi.encodeWithSelector(MockModule.initialize.selector, false, false, false, 0)
                )
            )
        );
    }

    modifier givenAppIsInstalled() {
        vm.prank(dev);
        appId = registry.registerApp(mockModule, client);

        uint256 totalRequired = registry.getAppPrice(address(mockModule));

        hoax(founder, totalRequired);
        registry.installApp{value: totalRequired}(mockModule, appAccount, "");

        _;
    }

    function test_signerFacet_customSigner() external view {
        assertEq(signerFacet.erc1271Signer(), founder);
    }

    function test_signerFacet_validateOwnerSignature() external view {
        bytes32 messageHash = keccak256(bytes("message"));
        bytes memory signature = _createPersonalSignature(
            founderPrivateKey,
            messageHash,
            address(signerFacet)
        );
        bytes4 magicValue = signerFacet.isValidSignature(messageHash, signature);
        assertEq(magicValue, ERC1271_MAGIC_VALUE);
    }

    function test_signerFacet_rejectInvalidSignature() external view {
        uint256 wrongPrivateKey = _createWrongPrivateKey();
        bytes32 messageHash = keccak256(bytes("message"));
        bytes memory signature = _createPersonalSignature(
            wrongPrivateKey,
            messageHash,
            address(signerFacet)
        );
        bytes4 magicValue = signerFacet.isValidSignature(messageHash, signature);
        assertEq(magicValue, INVALID_SIGNATURE);
    }

    function test_signerFacet_validateMockModuleSignature() external givenAppIsInstalled {
        bytes32 structHash = keccak256(abi.encode("Contents(bytes32 stuff)"));

        bytes32 dataHash = MessageHashUtils.toTypedDataHash(
            mockModule.DOMAIN_SEPARATOR(),
            structHash
        );

        bytes memory signature = _createPersonalSignature(
            founderPrivateKey,
            dataHash,
            address(signerFacet)
        );

        bytes4 magicValue = signerFacet.isValidSignature(dataHash, signature);
        assertEq(magicValue, ERC1271_MAGIC_VALUE);

        bytes memory data = abi.encodeWithSelector(
            mockModule.mockValidateSignature.selector,
            signature,
            structHash
        );

        vm.prank(client);
        bytes memory result = appAccount.execute(address(mockModule), 0, data);
        assertEq(bytes4(result), ERC1271_MAGIC_VALUE);
    }

    function test_signerFacet_replayAttack() external givenAppIsInstalled {
        // Create a second space with a different owner
        uint256 secondOwnerPrivateKey = boundPrivateKey(_randomUint256());
        address secondOwner = vm.addr(secondOwnerPrivateKey);

        IArchitectBase.SpaceInfo memory secondSpaceInfo = _createSpaceInfo("SecondSpace");
        secondSpaceInfo.membership.settings.pricingModule = pricingModule;

        vm.prank(secondOwner);
        address secondSpace = ICreateSpace(spaceFactory).createSpace(secondSpaceInfo);

        // Create signature for the first space (everyoneSpace with founder as owner)
        bytes32 messageHash = keccak256(bytes("message"));
        bytes memory signature = _createPersonalSignature(
            founderPrivateKey,
            messageHash,
            address(signerFacet)
        );

        // Signature should be valid for the original space
        bytes4 magicValue = signerFacet.isValidSignature(messageHash, signature);
        assertEq(magicValue, ERC1271_MAGIC_VALUE);

        // Signature should NOT be valid for the second space with different owner
        magicValue = SignerFacet(secondSpace).isValidSignature(messageHash, signature);
        assertEq(magicValue, INVALID_SIGNATURE);

        // Also test that a signature created for the second space doesn't work on the first
        bytes memory secondSignature = _createPersonalSignature(
            secondOwnerPrivateKey,
            messageHash,
            secondSpace
        );

        // Should be valid for second space
        magicValue = SignerFacet(secondSpace).isValidSignature(messageHash, secondSignature);
        assertEq(magicValue, ERC1271_MAGIC_VALUE);

        // Should NOT be valid for first space
        magicValue = signerFacet.isValidSignature(messageHash, secondSignature);
        assertEq(magicValue, INVALID_SIGNATURE);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          Utils                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createPersonalSignature(
        uint256 privateKey,
        bytes32 messageHash,
        address validator
    ) private view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(PERSONAL_SIGN_TYPEHASH, messageHash));
        bytes32 domainSeparator = SignerFacet(validator).DOMAIN_SEPARATOR();
        bytes32 finalHash = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, finalHash);
        return abi.encodePacked(r, s, v);
    }

    function _createWrongPrivateKey() private view returns (uint256 wrongPrivateKey) {
        wrongPrivateKey = boundPrivateKey(_randomUint256());
        require(wrongPrivateKey != founderPrivateKey, "Wrong key matches signer key");
    }
}
