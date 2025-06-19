// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {console} from "forge-std/console.sol";

//interfaces
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IArchitect} from "src/factory/facets/architect/IArchitect.sol";

//libraries
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

//contracts
import {ERC1271Facet} from "src/spaces/facets/account/ERC1271Facet.sol";
import {EIP712} from "solady/utils/EIP712.sol";
import {MockApp} from "test/mocks/MockApp.sol";

contract ERC1271Test is BaseSetup {
    ERC1271Facet internal erc1271Facet;
    EIP712 internal eip712;
    MockApp internal mockApp;

    // ERC1271 magic values
    bytes4 internal constant MAGICVALUE = 0x1626ba7e; // bytes4(keccak256("isValidSignature(bytes32,bytes)")
    bytes4 internal constant INVALID_SIGNATURE = 0xffffffff;

    // Test data
    bytes32 internal constant TEST_HASH = keccak256("test message");
    string internal constant TEST_MESSAGE = "Hello, ERC1271!";

    function setUp() public override {
        super.setUp();

        erc1271Facet = ERC1271Facet(everyoneSpace);
        eip712 = EIP712(everyoneSpace);
        mockApp = new MockApp();
    }

    function test_isValidSignature_validPersonalSign() external view {
        bytes32 messageHash = MessageHashUtils.toEthSignedMessageHash(bytes(TEST_MESSAGE));
        bytes memory signature = _signPersonalSign(founderPrivateKey, messageHash);
        bytes4 result = erc1271Facet.isValidSignature(messageHash, signature);
        assertEq(result, MAGICVALUE, "Should return magic value for valid signature");
    }

    function test_isValidSignature_validTypedDataSign() external view {
        string memory contentsDescription = "Mail(address to,string contents)";
        string memory contents = "Hello, Towns!";

        // Get signature data from MockApp
        (bytes32 mailHash, bytes32 structHash, bytes32 appDomainSeparator) = mockApp
            .getSignatureData(founder, contents);

        // Create the signature using the helper function
        bytes memory signature = _signTypedDataSign(
            founderPrivateKey,
            appDomainSeparator,
            structHash,
            contentsDescription
        );

        // Test 1: Direct call to isValidSignature (existing test)
        bytes4 result = erc1271Facet.isValidSignature(mailHash, signature);
        assertEq(result, MAGICVALUE, "Direct isValidSignature should return magic value");

        // Test 2: Real-world use case - MockApp validates the signature
        bool isValid = mockApp.validateMailSignature(
            address(everyoneSpace), // The ERC1271 contract
            founder, // The recipient
            contents, // The message contents
            signature // The signature
        );
        assertTrue(isValid, "MockApp should validate the signature successfully");
    }

    function test_isValidSignature_invalidTypedDataSign() external {
        string memory contents = "Hello, Towns!";

        // Create a signature with wrong private key (using a different key instead of founder)
        uint256 wrongPrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        string memory contentsDescription = "Mail(address to,string contents)";
        (bytes32 mailHash, bytes32 structHash, bytes32 appDomainSeparator) = mockApp
            .getSignatureData(founder, contents);

        // Sign with wrong private key
        bytes memory invalidSignature = _signTypedDataSign(
            wrongPrivateKey, // Wrong key!
            appDomainSeparator,
            structHash,
            contentsDescription
        );

        // Test 1: Direct call should revert for completely invalid signature
        vm.expectRevert();
        erc1271Facet.isValidSignature(mailHash, invalidSignature);

        // Test 2: MockApp should return false (it catches the revert)
        bool isValid = mockApp.validateMailSignature(
            address(everyoneSpace),
            founder,
            contents,
            invalidSignature
        );
        assertFalse(isValid, "MockApp should reject signature from wrong signer");
    }

    function _signPersonalSign(
        uint256 privateKey,
        bytes32 messageHash
    ) internal view returns (bytes memory) {
        bytes32 personalSignTypehash = keccak256("PersonalSign(bytes prefixed)");
        bytes32 personalSignStructHash = keccak256(abi.encode(personalSignTypehash, messageHash));
        bytes32 domainSeparator = erc1271Facet.DOMAIN_SEPARATOR();
        bytes32 finalHash = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, personalSignStructHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, finalHash);
        return abi.encodePacked(r, s, v);
    }

    function _signTypedDataSign(
        uint256 privateKey,
        bytes32 appDomainSeparator,
        bytes32 structHash,
        string memory contentsDescription
    ) internal view returns (bytes memory) {
        // Get the account's EIP-712 domain information and build TypedDataSign struct hash
        bytes32 typedDataSignStructHash = _buildTypedDataSignStructHash(structHash);

        // Build the final EIP-712 hash using APP_DOMAIN_SEPARATOR
        bytes32 eip712Hash = keccak256(
            abi.encodePacked("\x19\x01", appDomainSeparator, typedDataSignStructHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, eip712Hash);

        // Append domain separator, struct hash, contents description, and its length
        return
            abi.encodePacked(
                r,
                s,
                v,
                appDomainSeparator,
                structHash,
                bytes(contentsDescription),
                uint16(bytes(contentsDescription).length)
            );
    }

    function _buildTypedDataSignStructHash(bytes32 structHash) internal view returns (bytes32) {
        (
            ,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,

        ) = erc1271Facet.eip712Domain();

        // The TypedDataSign struct has the format:
        // TypedDataSign(Mail contents,string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)Mail(address to,string contents)
        // We construct this dynamically using the MockApp's MAIL_TYPEHASH
        string memory mailTypeString = "Mail(address to,string contents)";
        string memory typedDataSignTypeString = string(
            abi.encodePacked(
                "TypedDataSign(Mail contents,string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)",
                mailTypeString
            )
        );

        bytes32 typedDataSignTypehash = keccak256(bytes(typedDataSignTypeString));

        return
            keccak256(
                abi.encode(
                    typedDataSignTypehash,
                    structHash, // contents (the Mail struct hash)
                    keccak256(bytes(name)),
                    keccak256(bytes(version)),
                    chainId,
                    verifyingContract,
                    salt
                )
            );
    }
}
