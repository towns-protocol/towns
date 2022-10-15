"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeEventRef = exports.checkEvents = exports.checkEvent = exports.makeEvents = exports.makeEvent = exports.hashEvent = void 0;
const util_1 = require("@ethereumjs/util");
const nanoid_1 = require("nanoid");
const check_1 = require("./check");
const err_1 = require("./err");
// TODO: Here event should be hashed according to "EIP-712: Typed structured data hashing and signing"
// For now, not to fiddle with the type descriptor, we just use hashPersonalMessage.
const hashEvent = (event) => {
    const hashBuffer = (0, util_1.hashPersonalMessage)(Buffer.from(JSON.stringify(event)));
    const hash = '0x' + hashBuffer.toString('hex');
    return [hash, hashBuffer];
};
exports.hashEvent = hashEvent;
// To make event, we need hash, creator address and signature
// Sign APIs usually only return a signature, so this implementation
// hashes and then signs directly by using private key from the Wallet.
//
// TODO: switch to signTypedData before realease, which is more stable than this implementation
// due to potensial instability in JSON encoding.
// signTypedData requires type descriptor, and a bit too much to maintain
// it at this stage of development.
const makeEvent = (wallet, payload, prevEvents) => {
    if (payload.kind !== 'inception') {
        (0, check_1.check)(prevEvents.length > 0, 'prevEvents should be present', err_1.Err.BAD_PREV_EVENTS);
    }
    const re = /^0x[0-9a-f]{64}$/;
    for (const prevEvent of prevEvents) {
        (0, check_1.check)(re.test(prevEvent), 'Bad hash format, should be ^0x[0-9a-f]{64}$', err_1.Err.BAD_HASH_FORMAT);
    }
    const event = {
        creatorAddress: wallet.address,
        salt: (0, nanoid_1.nanoid)(),
        prevEvents: prevEvents,
        payload: payload,
    };
    const [hash, hashBuffer] = (0, exports.hashEvent)(event);
    const { v, r, s } = (0, util_1.ecsign)(hashBuffer, Buffer.from(wallet.privateKey.slice(2), 'hex'));
    const signature = (0, util_1.toRpcSig)(v, r, s);
    return { hash, signature, base: event };
};
exports.makeEvent = makeEvent;
const makeEvents = (wallet, payloads, prevEvents) => {
    const events = [];
    for (const payload of payloads) {
        const event = (0, exports.makeEvent)(wallet, payload, prevEvents);
        events.push(event);
        prevEvents = [event.hash];
    }
    return events;
};
exports.makeEvents = makeEvents;
const checkEvent = (event, prevEventHash) => {
    if (prevEventHash !== null) {
        (0, check_1.check)(event.base.prevEvents.length === 1, 'prevEvents.length should be 1', err_1.Err.BAD_PREV_EVENTS);
        (0, check_1.check)(event.base.prevEvents[0] === prevEventHash, 'prevEvents[0] is not valid', err_1.Err.BAD_PREV_EVENTS);
    }
    const [hash, hashBuffer] = (0, exports.hashEvent)(event.base);
    (0, check_1.check)(hash === event.hash, 'Event id is not valid', err_1.Err.BAD_EVENT_ID);
    const { v, r, s } = (0, util_1.fromRpcSig)(event.signature);
    const pubKey = (0, util_1.ecrecover)(hashBuffer, v, r, s);
    const address = (0, util_1.toChecksumAddress)('0x' + (0, util_1.publicToAddress)(pubKey).toString('hex'));
    (0, check_1.check)(address === event.base.creatorAddress, 'Event signature is not valid', err_1.Err.BAD_EVENT_SIGNATURE);
};
exports.checkEvent = checkEvent;
const checkEvents = (event) => {
    let prevEventHash = null;
    for (const e of event) {
        (0, exports.checkEvent)(e, prevEventHash);
        prevEventHash = e.hash;
    }
};
exports.checkEvents = checkEvents;
const makeEventRef = (streamId, event) => {
    return {
        streamId,
        hash: event.hash,
        signature: event.signature,
        creatorAddress: event.base.creatorAddress,
    };
};
exports.makeEventRef = makeEventRef;
