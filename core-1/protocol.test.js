/**
 * ════════════════════════════════════════════════════════════════
 *  Protocol Unit Tests — node --test protocol.test.js
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  COMMANDS, SYNC_A2D, SYNC_D2A, StreamBuffer,
  computeCRC, buildPacket, parsePacket, parseStream,
  interpretPacket, toHexString,
} = require('./protocol.js');

describe('Round-Trip Integrity', () => {
  it('T1: GET_BATTERY (App to Device) round-trip', () => {
    const pkt = buildPacket('a2d', COMMANDS.GET_BATTERY, []);
    assert.ok(pkt);
    const parsed = parsePacket(pkt);
    assert.ok(parsed);
    assert.equal(parsed.direction, 'a2d');
    assert.equal(parsed.command, COMMANDS.GET_BATTERY);
    assert.deepEqual(parsed.payload, []);
    assert.equal(parsed.valid, true);
  });

  it('T2: GET_BATTERY Reply (Device to App) round-trip with payload', () => {
    const pkt = buildPacket('d2a', COMMANDS.GET_BATTERY, [85, 1]); // 85%, charging
    const parsed = parsePacket(pkt);
    assert.ok(parsed);
    assert.equal(parsed.direction, 'd2a');
    assert.deepEqual(parsed.payload, [85, 1]);
    assert.equal(parsed.payloadLength, 2);
  });

  it('T3: Multi-byte payload (SYNC_TIME = 7 bytes)', () => {
    const payload = [0x07, 0xEA, 0x05, 0x13, 0x0A, 0x1E, 0x00]; // 2026-05-19 10:30:00
    const pkt = buildPacket('a2d', COMMANDS.SYNC_TIME, payload);
    const parsed = parsePacket(pkt);
    assert.ok(parsed);
    assert.deepEqual(parsed.payload, payload);
  });

  it('T4: All command types round-trip correctly', () => {
    for (const [name, id] of Object.entries(COMMANDS)) {
      const pkt = buildPacket('a2d', id, [0x30]);
      const parsed = parsePacket(pkt);
      assert.ok(parsed, `${name} should parse`);
      assert.equal(parsed.command, id);
    }
  });
});

describe('CRC Failure Detection', () => {
  it('T5: Flipped CRC byte → null', () => {
    const pkt = buildPacket('d2a', COMMANDS.CHARGING_STATUS, [1, 99]);
    pkt[pkt.length - 1] ^= 0xFF;
    assert.equal(parsePacket(pkt), null);
  });

  it('T6: Flipped payload byte → CRC mismatch → null', () => {
    const pkt = buildPacket('a2d', COMMANDS.SET_LED, [0x31]);
    pkt[5] ^= 0x01; // flip payload byte
    assert.equal(parsePacket(pkt), null);
  });

  it('T7: Flipped command byte → CRC mismatch → null', () => {
    const pkt = buildPacket('a2d', COMMANDS.TAKE_PHOTO, [0x30]);
    pkt[2] ^= 0x80;
    assert.equal(parsePacket(pkt), null);
  });

  it('T8: CRC is exactly (cmd + sum(data)) & 0xFF', () => {
    const cmd = COMMANDS.SET_LED;
    const data = [0x32];
    const expected = (cmd + 0x32) & 0xFF;
    assert.equal(computeCRC(cmd, data), expected);
    const pkt = buildPacket('a2d', cmd, data);
    assert.equal(pkt[pkt.length - 1], expected);
  });
});

describe('Truncated & Malformed Input', () => {
  it('T9: Missing CRC byte → null', () => {
    const pkt = buildPacket('a2d', COMMANDS.GET_BATTERY, []);
    assert.equal(parsePacket(pkt.slice(0, pkt.length - 1)), null);
  });

  it('T10: Only sync bytes → null', () => {
    assert.equal(parsePacket(new Uint8Array([0xAB, 0x55])), null);
  });

  it('T11: Empty / null / undefined → null', () => {
    assert.equal(parsePacket(new Uint8Array([])), null);
    assert.equal(parsePacket(null), null);
    assert.equal(parsePacket(undefined), null);
  });

  it('T12: Wrong sync bytes → null', () => {
    const pkt = buildPacket('a2d', COMMANDS.TAKE_PHOTO, [0x30]);
    pkt[0] = 0xAA; // invalid sync
    assert.equal(parsePacket(pkt), null);
  });

  it('T13: Length field is too large (truncated packet) → null', () => {
    const pkt = buildPacket('a2d', COMMANDS.TAKE_PHOTO, [0x30]);
    pkt[4] = 0xFF; // inflate length
    assert.equal(parsePacket(pkt), null);
  });
});

describe('Concatenated Stream Parsing', () => {
  it('T14: Two valid packets → both parsed', () => {
    const pkt1 = buildPacket('a2d', COMMANDS.GET_BATTERY, []);
    const pkt2 = buildPacket('d2a', COMMANDS.CHARGING_STATUS, [1, 50]);
    const stream = new Uint8Array([...pkt1, ...pkt2]);
    const results = parseStream(stream);
    assert.equal(results.length, 2);
    assert.equal(results[0].command, COMMANDS.GET_BATTERY);
    assert.equal(results[1].command, COMMANDS.CHARGING_STATUS);
  });

  it('T15: Three packets with garbage → all recovered', () => {
    const p1 = buildPacket('a2d', COMMANDS.SET_LED, [0x30]);
    const p2 = buildPacket('d2a', COMMANDS.ACTION_SYNC, [0,0,0,0,0,1,0,0,1]);
    const p3 = buildPacket('a2d', COMMANDS.GET_BATTERY, []);
    const garbage = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    const stream = new Uint8Array([...p1, ...garbage, ...p2, ...garbage, ...p3]);
    const results = parseStream(stream);
    assert.equal(results.length, 3);
  });

  it('T16: Corrupted packet among valid → skip corrupted', () => {
    const p1 = buildPacket('a2d', COMMANDS.TAKE_PHOTO, [0x30]);
    const bad = buildPacket('d2a', COMMANDS.CHARGING_STATUS, [0, 10]);
    bad[bad.length - 1] ^= 0xFF; // corrupt crc
    const p3 = buildPacket('a2d', COMMANDS.GET_BATTERY, []);
    const stream = new Uint8Array([...p1, ...bad, ...p3]);
    const results = parseStream(stream);
    assert.equal(results.length, 2); // gets p1 and p3
  });

  it('T17: Empty stream / Partial packet buffered', () => {
    assert.deepEqual(parseStream(new Uint8Array([])), []);
    // Partial packet at end of stream should be ignored (simulating streaming buffer wait)
    const pkt = buildPacket('a2d', COMMANDS.TAKE_PHOTO, [0x30]);
    const partial = pkt.slice(0, pkt.length - 2);
    assert.deepEqual(parseStream(partial), []);
  });
});

describe('Streaming Buffer Fragmentation', () => {
  it('T18: Stateful StreamBuffer reconstructs fragmented packets (MTU Simulation)', () => {
    const sb = new StreamBuffer();
    const fullPacket = buildPacket('d2a', COMMANDS.ACTION_SYNC, [1, 2, 3, 4, 5, 6, 7, 8, 9]); // 15 bytes total
    
    // Chunk 1: first 5 bytes
    const chunk1 = fullPacket.slice(0, 5);
    const result1 = sb.push(chunk1);
    assert.equal(result1.length, 0); // Not enough data yet
    
    // Chunk 2: next 5 bytes
    const chunk2 = fullPacket.slice(5, 10);
    const result2 = sb.push(chunk2);
    assert.equal(result2.length, 0); // Still not enough

    // Chunk 3: final 5 bytes + start of next packet
    const nextPacket = buildPacket('a2d', COMMANDS.GET_BATTERY, []); // 6 bytes
    const chunk3 = new Uint8Array([...fullPacket.slice(10, 15), ...nextPacket.slice(0, 2)]);
    const result3 = sb.push(chunk3);
    assert.equal(result3.length, 1); // First packet completed!
    assert.equal(result3[0].command, COMMANDS.ACTION_SYNC);

    // Chunk 4: rest of next packet
    const chunk4 = nextPacket.slice(2, 6);
    const result4 = sb.push(chunk4);
    assert.equal(result4.length, 1); // Second packet completed!
    assert.equal(result4[0].command, COMMANDS.GET_BATTERY);
  });
});

describe('Builder Edge Cases', () => {
  it('T19: Invalid cmdId / direction → null', () => {
    assert.equal(buildPacket('invalid', COMMANDS.TAKE_PHOTO, []), null);
    assert.equal(buildPacket('a2d', null, []), null);
    assert.equal(buildPacket('a2d', 256, []), null);
  });

  it('T20: Non-array payload → null', () => {
    assert.equal(buildPacket('a2d', COMMANDS.TAKE_PHOTO, 'bad'), null);
  });
});

describe('Utility Functions', () => {
  it('T21: interpretPacket returns meaningful string', () => {
    const pkt = parsePacket(buildPacket('d2a', COMMANDS.CHARGING_STATUS, [1, 85]));
    const desc = interpretPacket(pkt);
    assert.ok(desc.includes('85'));
  });

  it('T22: toHexString formats correctly', () => {
    assert.equal(toHexString(new Uint8Array([0xAB, 0x55, 0x01])), '0xAB 0x55 0x01');
  });
});
