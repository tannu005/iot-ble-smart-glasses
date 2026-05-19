/**
 * ════════════════════════════════════════════════════════════════
 *  Protocol Unit Tests — node --test protocol.test.js
 * ════════════════════════════════════════════════════════════════
 *  CRC = (cmd + sum(data)) & 0xFF
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  COMMANDS, COMMAND_NAMES, SYNC,
  HEADER_SIZE, CRC_SIZE, MIN_PACKET_SIZE,
  computeCRC, buildPacket, parsePacket, parseStream,
  interpretPacket, toHexString,
} = require('./protocol.js');

// ═══════════════════════════════════════════════════════════════
//  1 — Round-Trip (build → parse → verify)
// ═══════════════════════════════════════════════════════════════
describe('Round-Trip Integrity', () => {
  it('T1: BATTERY_LEVEL round-trip preserves command and payload', () => {
    const pkt = buildPacket(COMMANDS.BATTERY_LEVEL, [85]);
    assert.ok(pkt);
    const parsed = parsePacket(pkt);
    assert.ok(parsed);
    assert.equal(parsed.command, COMMANDS.BATTERY_LEVEL);
    assert.equal(parsed.commandName, 'BATTERY_LEVEL');
    assert.deepEqual(parsed.payload, [85]);
    assert.equal(parsed.valid, true);
  });

  it('T2: Empty payload (TRIGGER_PHOTO)', () => {
    const pkt = buildPacket(COMMANDS.TRIGGER_PHOTO, []);
    const parsed = parsePacket(pkt);
    assert.ok(parsed);
    assert.deepEqual(parsed.payload, []);
    assert.equal(parsed.payloadLength, 0);
    assert.equal(parsed.rawLength, MIN_PACKET_SIZE);
  });

  it('T3: Multi-byte payload (SYNC_TIME = 4-byte epoch)', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = [now & 0xFF, (now >> 8) & 0xFF, (now >> 16) & 0xFF, (now >> 24) & 0xFF];
    const pkt = buildPacket(COMMANDS.SYNC_TIME, payload);
    const parsed = parsePacket(pkt);
    assert.ok(parsed);
    assert.deepEqual(parsed.payload, payload);
  });

  it('T4: All command types round-trip correctly', () => {
    for (const [name, id] of Object.entries(COMMANDS)) {
      const pkt = buildPacket(id, [0x42]);
      const parsed = parsePacket(pkt);
      assert.ok(parsed, `${name} should parse`);
      assert.equal(parsed.command, id);
      assert.equal(parsed.commandName, name);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  2 — CRC Failure Detection
// ═══════════════════════════════════════════════════════════════
describe('CRC Failure Detection', () => {
  it('T5: Flipped CRC byte → null', () => {
    const pkt = buildPacket(COMMANDS.BATTERY_LEVEL, [75]);
    pkt[pkt.length - 1] ^= 0xFF;
    assert.equal(parsePacket(pkt), null);
  });

  it('T6: Flipped payload byte → CRC mismatch → null', () => {
    const pkt = buildPacket(COMMANDS.SET_LED, [50]);
    pkt[HEADER_SIZE] ^= 0x01;
    assert.equal(parsePacket(pkt), null);
  });

  it('T7: Flipped command byte → CRC mismatch → null', () => {
    const pkt = buildPacket(COMMANDS.ACK, [0x01]);
    pkt[2] ^= 0x80;
    assert.equal(parsePacket(pkt), null);
  });

  it('T8: CRC is exactly (cmd + sum(data)) & 0xFF', () => {
    const cmd = COMMANDS.SET_LED;
    const data = [75];
    const expected = (cmd + 75) & 0xFF;
    assert.equal(computeCRC(cmd, data), expected);
    const pkt = buildPacket(cmd, data);
    assert.equal(pkt[pkt.length - 1], expected);
  });
});

// ═══════════════════════════════════════════════════════════════
//  3 — Truncated / Malformed Input
// ═══════════════════════════════════════════════════════════════
describe('Truncated & Malformed Input', () => {
  it('T9: Missing CRC byte → null', () => {
    const pkt = buildPacket(COMMANDS.BATTERY_LEVEL, [90]);
    assert.equal(parsePacket(pkt.slice(0, pkt.length - 1)), null);
  });

  it('T10: Only sync bytes → null', () => {
    assert.equal(parsePacket(new Uint8Array([0xAA, 0x55])), null);
  });

  it('T11: Empty / null / undefined → null', () => {
    assert.equal(parsePacket(new Uint8Array([])), null);
    assert.equal(parsePacket(null), null);
    assert.equal(parsePacket(undefined), null);
  });

  it('T12: Wrong sync bytes → null', () => {
    const pkt = buildPacket(COMMANDS.ACK, [0x01]);
    pkt[0] = 0xBB;
    assert.equal(parsePacket(pkt), null);
  });

  it('T13: Inflated length field → null', () => {
    const pkt = buildPacket(COMMANDS.BATTERY_LEVEL, [42]);
    pkt[3] = 0xFF;
    assert.equal(parsePacket(pkt), null);
  });
});

// ═══════════════════════════════════════════════════════════════
//  4 — Concatenated Stream Parsing
// ═══════════════════════════════════════════════════════════════
describe('Concatenated Stream Parsing', () => {
  it('T14: Two valid packets → both parsed', () => {
    const pkt1 = buildPacket(COMMANDS.BATTERY_LEVEL, [80]);
    const pkt2 = buildPacket(COMMANDS.CHARGING_STATE, [1]);
    const stream = new Uint8Array([...pkt1, ...pkt2]);
    const results = parseStream(stream);
    assert.equal(results.length, 2);
    assert.equal(results[0].command, COMMANDS.BATTERY_LEVEL);
    assert.equal(results[1].command, COMMANDS.CHARGING_STATE);
  });

  it('T15: Three packets with garbage → all recovered', () => {
    const p1 = buildPacket(COMMANDS.NOD_DETECTED, [0]);
    const p2 = buildPacket(COMMANDS.SET_LED, [75]);
    const p3 = buildPacket(COMMANDS.ACK, [0x02]);
    const garbage = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    const stream = new Uint8Array([...p1, ...garbage, ...p2, ...garbage, ...p3]);
    const results = parseStream(stream);
    assert.equal(results.length, 3);
  });

  it('T16: Corrupted packet among valid → skip corrupted', () => {
    const p1 = buildPacket(COMMANDS.PHOTO_CAPTURED, [1]);
    const bad = buildPacket(COMMANDS.BATTERY_LEVEL, [50]);
    bad[bad.length - 1] ^= 0xFF;
    const p3 = buildPacket(COMMANDS.TRIGGER_PHOTO, []);
    const stream = new Uint8Array([...p1, ...bad, ...p3]);
    const results = parseStream(stream);
    assert.ok(results.length >= 2);
  });

  it('T17: Empty stream → empty array', () => {
    assert.deepEqual(parseStream(new Uint8Array([])), []);
    assert.deepEqual(parseStream(null), []);
  });
});

// ═══════════════════════════════════════════════════════════════
//  5 — Builder Edge Cases
// ═══════════════════════════════════════════════════════════════
describe('Builder Edge Cases', () => {
  it('T18: Invalid cmdId → null', () => {
    assert.equal(buildPacket(null), null);
    assert.equal(buildPacket(undefined), null);
    assert.equal(buildPacket('bad'), null);
    assert.equal(buildPacket(-1), null);
    assert.equal(buildPacket(256), null);
  });

  it('T19: Non-array payload → null', () => {
    assert.equal(buildPacket(COMMANDS.ACK, 'bad'), null);
    assert.equal(buildPacket(COMMANDS.ACK, 42), null);
  });

  it('T20: Large payload (255 bytes) round-trips', () => {
    const big = Array.from({ length: 255 }, (_, i) => i & 0xFF);
    const pkt = buildPacket(COMMANDS.ERROR, big);
    const parsed = parsePacket(pkt);
    assert.ok(parsed);
    assert.equal(parsed.payloadLength, 255);
    assert.deepEqual(parsed.payload, big);
  });
});

// ═══════════════════════════════════════════════════════════════
//  6 — Utilities
// ═══════════════════════════════════════════════════════════════
describe('Utility Functions', () => {
  it('T21: interpretPacket returns meaningful string', () => {
    const pkt = parsePacket(buildPacket(COMMANDS.BATTERY_LEVEL, [85]));
    const desc = interpretPacket(pkt);
    assert.ok(desc.includes('85'));
  });

  it('T22: toHexString formats correctly', () => {
    assert.equal(toHexString(new Uint8Array([0xAA, 0x55, 0x03])), '0xAA 0x55 0x03');
  });

  it('T23: interpretPacket(null) is graceful', () => {
    assert.ok(interpretPacket(null).length > 0);
  });

  it('T24: CRC determinism', () => {
    const c1 = computeCRC(0x03, [85]);
    const c2 = computeCRC(0x03, [85]);
    assert.equal(c1, c2);
    assert.equal(c1, (0x03 + 85) & 0xFF);
  });
});
