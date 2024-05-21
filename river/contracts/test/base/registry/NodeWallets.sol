// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

struct Wallet {
  uint256 privateKey;
  bytes publicKey;
  address addr;
}

// Wallets is a contract that holds 10 wallets for testing purposes
contract NodeWallets {
  Wallet public wallet1 =
    Wallet(
      0x31ae5637bae23644b160d93ffa3a1a9424555b525f6bfebc7429a96eebd3e649,
      hex"2a615d5bdbad327ac938ac6b439a0d357ad9d453f0007dc0f32964e31c31e4fd42dae3832db7bc9d0e2321feed278f77882af1aa8e7006634dcc17c47fc36010",
      0xe64558fcdC16Da6a5630015ebAfA9C9C90565cC9
    );

  Wallet public wallet2 =
    Wallet(
      0x2ead8bb75fe39ff11d542631ec1bf2e48bd7d71f1414aa3970b2944ec85a494c,
      hex"5913d0b8ea4bba67122c6388bbb3d75bae5ccfea2f0c0ef1b9984268f0f20f2b0b6c49eb8741b37ca75e5e55a5d5b28082ceaed9b01bdb283175bb82759f2e35",
      0x37e2b6E725e8fd263A0ca0A57EfcBcDEC67B002e
    );

  Wallet public wallet3 =
    Wallet(
      0x6e9102413b163af8d735454118f68c7575068892e72ba4b66b0b75a513e8fa96,
      hex"4d81bce3d646dac3d1801d3a69928747333f178a400e20497476971708e3b221b06370a15e46a7dbb67a7d29d7d62496e41011cecd5bda24ca01fb1fea81b741",
      0xB5Ac7b8A53C01322690D6E6718515474E2c84c2f
    );

  Wallet public wallet4 =
    Wallet(
      0x63642ec609087efe67b495e736caf2680ba46535da807d5e02b0659c23374db7,
      hex"a08bbb2fcc435055e4a4a218086ffcd77347c6405ae8a7b1c22e82eea4ef02c813fb7591664ad4ca153be3af0e8ffe30378a32aeec5742872693dea9228de6e4",
      0xeB52f257e5286B7b8D1d32a4833AAdcD63588267
    );

  Wallet public wallet5 =
    Wallet(
      0x790ca6a691e0dfe6266b47601861c6e7186d9f45a0342f8b0005d2445b96511f,
      hex"bb308bbd0e21c3cfbcc3e59133e0f549857d0b42a4bd57c3ba75da850ceb0ce888fb23012eb682171525baacb87f373bc48d98c4f2cfeb3c43640627827c9230",
      0x92C9c1236F7e7B67BbEb26A6f506B0319B5517Fd
    );

  Wallet public wallet6 =
    Wallet(
      0x1403937f0b9c05460fe92b060dac3fff0ceb3be764fd50be35deda43c32a753f,
      hex"fc5ab8993c56bd44bdc00effec8b1f8d14b8a60d2185d51e8c0b5fba5e96f0f4bb91453ae453d2722bd3cc2e90f387afbba91d5b135333f8fecfa68d198248b4",
      0x6Bc2f80C70Fa96F3882664817308EBEDA9Cb1fbD
    );

  Wallet public wallet7 =
    Wallet(
      0xdc107e5444ae514068d4ec87f06820925cd0c73121e041b06e07feca62f2ee47,
      hex"cc5767900ae03a7930a5e85360434b29e244ef0dfb1bcf7dfc23b0b43d189d15a4a22e90dd39f76a23c31fce2f21f3ed68dbdb6b05f6548c3986fd4b74fad1a1",
      0xE3Cc6126Ea1E07245D844BBdC0C0d36696E63A6d
    );

  Wallet public wallet8 =
    Wallet(
      0x7d3fee830907275bdc2a25d122e19d45c25d84df0d28fb5e670713f3aca5ccf4,
      hex"3211096dd0149f27281c71a944cea12e3212072a05180c9ed095169f1a21ed2389d0e4aacd51bf9cf157a626e8c3b7978c02a9d93622a157828912c5c3a886b5",
      0x12c87e9DE9a6a29f58ae6aD8C03D508fC9D7dc04
    );

  Wallet public wallet9 =
    Wallet(
      0x661df9e1eeffc041323be49025f5e44c23db4e6a96d1b45037624931db56d3a6,
      hex"5fb44ee351b630907a1b2a2ed49cd916a59767f7885ea5eb00c59c0cc129a01b6a9239c999cd9288f9114455706ba86e688de3fb8f2d25757e19e5a2f137d390",
      0x2c5AbDd50d8EB4D74CaAb582bF5f204Ab8390e68
    );
  Wallet public wallet10 =
    Wallet(
      0x7e25cfa9118083ee211522ae6dc53aed983a0132db284b11c8647afc0407376b,
      hex"44d9a81f15a34bbc55add5df98ef6b965b2ccc4a57cad15a635be1c65dd88892337d1fe17288542a677f6edba289034bb61fc9018214dcca116ff1cb23f0cbe4",
      0x3b58cC09629480DE635810797Ba5F52511E6FFD1
    );
}
