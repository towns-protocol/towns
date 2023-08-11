// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {ERC2771RecipientFacet} from "contracts/src/diamond/facets/recipient/ERC2771RecipientFacet.sol";
import {MinimalForwarder} from "openzeppelin-contracts/contracts/metatx/MinimalForwarder.sol";

abstract contract ERC2771RecipientSetup is FacetTest {
  ERC2771RecipientFacet internal recipient;

  address internal forwarder;
  bytes32 internal typehashForwardRequest;
  bytes32 internal nameHash;
  bytes32 internal versionHash;
  bytes32 internal typehashEip712;
  bytes32 internal domainSeparator;

  function setUp() public override {
    super.setUp();

    typehashForwardRequest = keccak256(
      "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
    );
    nameHash = keccak256(bytes("MinimalForwarder"));
    versionHash = keccak256(bytes("0.0.1"));
    typehashEip712 = keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    domainSeparator = keccak256(
      abi.encode(
        typehashEip712,
        nameHash,
        versionHash,
        block.chainid,
        forwarder
      )
    );

    recipient = ERC2771RecipientFacet(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    ERC2771RecipientHelper recipientHelper = new ERC2771RecipientHelper();

    forwarder = address(new MinimalForwarder());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = recipientHelper.makeCut(IDiamond.FacetCutAction.Add);

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: recipientHelper.facet(),
        initData: abi.encodeWithSelector(
          recipientHelper.initializer(),
          forwarder
        )
      });
  }

  function signForwarderRequest(
    MinimalForwarder.ForwardRequest memory forwardRequest,
    uint256 privateKey
  ) internal view returns (bytes memory) {
    bytes memory encodedRequest = abi.encode(
      typehashForwardRequest,
      forwardRequest.from,
      forwardRequest.to,
      forwardRequest.value,
      forwardRequest.gas,
      forwardRequest.nonce,
      keccak256(forwardRequest.data)
    );
    bytes32 structHash = keccak256(encodedRequest);
    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, typedDataHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    return signature;
  }
}

contract ERC2771RecipientHelper is FacetHelper {
  ERC2771RecipientFacet public erc2771Recipient;

  constructor() {
    erc2771Recipient = new ERC2771RecipientFacet();
  }

  function facet() public view override returns (address) {
    return address(erc2771Recipient);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](3);
    selectors_[0] = erc2771Recipient.isTrustedForwarder.selector;
    selectors_[1] = erc2771Recipient.callGasless.selector;
    selectors_[2] = erc2771Recipient.getCaller.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return ERC2771RecipientFacet.__ERC2771Recipient_init.selector;
  }
}
