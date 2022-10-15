"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("@ethereumjs/util");
const eth_sig_util_1 = require("@metamask/eth-sig-util");
const ethers_1 = require("ethers");
const lodash_1 = __importDefault(require("lodash"));
const sign_1 = require("./sign");
const types_1 = require("./types");
describe('sign', () => {
    const msg = 'Hello, World!';
    const privateKey = '0123456789012345678901234567890123456789012345678901234567890123';
    const privateKey2 = '0123456789012345678901234567890123456789012345678901234567890124';
    const hash = '0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b0';
    const badHashes = [
        '0x8Dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b0',
        '0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b00',
        '0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b',
    ];
    test('compare-ethereumjs-metamask-ethers', async () => {
        const privateKeyBuffer = Buffer.from(privateKey, 'hex');
        const hashEjs = (0, util_1.hashPersonalMessage)(Buffer.from(msg));
        const sigStructEjs = (0, util_1.ecsign)(hashEjs, privateKeyBuffer);
        const sigEjs = (0, util_1.toRpcSig)(sigStructEjs.v, sigStructEjs.r, sigStructEjs.s);
        const sigMM = (0, eth_sig_util_1.personalSign)({ data: msg, privateKey: privateKeyBuffer });
        expect(sigEjs).toEqual(sigMM);
        const wallet = new ethers_1.Wallet(privateKey);
        const sigEthers = await wallet.signMessage(msg);
        expect(sigMM).toEqual(sigEthers);
    });
    test('sign-and-verify', async () => {
        const wallet = new ethers_1.Wallet(privateKey);
        const payload = { kind: 'message', text: msg };
        const event = (0, sign_1.makeEvent)(wallet, payload, [hash]);
        (0, sign_1.checkEvent)(event, null);
        // Event with same payload from different wallet doesn't match
        const wallet2 = new ethers_1.Wallet(privateKey2);
        const event2 = (0, sign_1.makeEvent)(wallet2, payload, [hash]);
        (0, sign_1.checkEvent)(event2, null);
        expect(event2).not.toEqual(event);
        expect(() => {
            const e = lodash_1.default.cloneDeep(event);
            e.hash = event2.hash;
            (0, sign_1.checkEvent)(e, null);
        }).toThrow();
        expect(() => {
            const e = lodash_1.default.cloneDeep(event);
            e.signature = event2.signature;
            (0, sign_1.checkEvent)(e, null);
        }).toThrow();
        expect(() => {
            const e = lodash_1.default.cloneDeep(event);
            e.base.creatorAddress = event2.base.creatorAddress;
            (0, sign_1.checkEvent)(e, null);
        }).toThrow();
        // Event with same payload from the same wallet doesn't match
        const event3 = (0, sign_1.makeEvent)(wallet, payload, [hash]);
        (0, sign_1.checkEvent)(event3, null);
        expect(event3.hash).not.toEqual(event.hash);
        expect(event3).not.toEqual(event);
    });
    test('validate-prev-events', async () => {
        const wallet = new ethers_1.Wallet(privateKey);
        (0, sign_1.makeEvent)(wallet, { kind: 'inception', streamId: '0x22', data: { streamKind: types_1.StreamKind.User } }, []);
        const payload = { kind: 'message', text: msg };
        (0, sign_1.makeEvent)(wallet, payload, [hash]);
        (0, sign_1.makeEvent)(wallet, payload, [hash, hash, hash]);
        badHashes.forEach((h) => {
            expect(() => {
                (0, sign_1.makeEvent)(wallet, payload, [h]);
            }).toThrow();
        });
        badHashes.forEach((h) => {
            expect(() => {
                (0, sign_1.makeEvent)(wallet, payload, [hash, h]);
            }).toThrow();
        });
    });
});
