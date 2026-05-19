/**
 * ════════════════════════════════════════════════════════════════
 *  IoT BLE Smart Glasses — Protocol Parser & Builder
 * ════════════════════════════════════════════════════════════════
 */

'use strict';

const SYNC_A2D = [0xAB, 0x55];
const SYNC_D2A = [0xAC, 0x55];

const HEADER_SIZE = 5; // SYNC(2) + CMD(1) + LEN(2)
const CRC_SIZE = 1;

const COMMANDS = Object.freeze({
  SET_LED: 0x01,
  GET_BATTERY: 0x17, // Reply is 0x17 as well
  TAKE_PHOTO: 0x22,
  ACTION_SYNC: 0x45,
  CHARGING_STATUS: 0x53,
  SYNC_TIME: 0x59
});

const COMMAND_NAMES = Object.freeze(
  Object.fromEntries(Object.entries(COMMANDS).map(([k, v]) => [v, k]))
);

function computeCRC(cmd, data) {
  let sum = cmd;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum & 0xFF;
}

// buildPacket now takes direction to use the correct sync bytes
function buildPacket(dir, cmd, data = []) {
  try {
    if (dir !== 'a2d' && dir !== 'd2a') return null;
    if (cmd === undefined || cmd === null || typeof cmd !== 'number') return null;
    if (!Array.isArray(data)) return null;
    
    // length covers cmd (1) + data (N) + crc (1)
    const len = 1 + data.length + 1;
    if (len > 0xFFFF || cmd < 0 || cmd > 0xFF) return null;

    // Big-endian length
    const lenHi = (len >> 8) & 0xFF;
    const lenLo = len & 0xFF;
    
    const crc = computeCRC(cmd, data);
    const sync = dir === 'a2d' ? SYNC_A2D : SYNC_D2A;

    return new Uint8Array([...sync, cmd, lenHi, lenLo, ...data, crc]);
  } catch (_) { return null; }
}

function parsePacket(raw) {
  try {
    if (!raw || raw.length < HEADER_SIZE + CRC_SIZE) return null;
    
    let dir;
    if (raw[0] === SYNC_A2D[0] && raw[1] === SYNC_A2D[1]) dir = 'a2d';
    else if (raw[0] === SYNC_D2A[0] && raw[1] === SYNC_D2A[1]) dir = 'd2a';
    else return null;

    const cmd = raw[2];
    // Big-endian length
    const packetLen = (raw[3] << 8) | raw[4];
    
    // Total raw bytes = SYNC(2) + length(2) + packetLen(cmd+data+crc)
    const totalLen = 4 + packetLen;
    if (raw.length < totalLen) return null;

    const payloadLen = packetLen - 2; // Subtract cmd and crc from packetLen
    if (payloadLen < 0) return null;

    const payload = Array.from(raw.slice(HEADER_SIZE, HEADER_SIZE + payloadLen));
    const expectedCrc = computeCRC(cmd, payload);
    const receivedCrc = raw[HEADER_SIZE + payloadLen];

    if (expectedCrc !== receivedCrc) return null;

    return {
      direction: dir,
      command: cmd,
      commandName: COMMAND_NAMES[cmd] || `UNKNOWN_0x${cmd.toString(16).padStart(2, '0').toUpperCase()}`,
      payload,
      payloadLength: payloadLen,
      rawLength: totalLen,
      crc: receivedCrc,
      valid: true,
    };
  } catch (_) { return null; }
}

// ── Streaming Buffer (Handles Fragmentation) ───────────────
class StreamBuffer {
  constructor() {
    this.buffer = new Uint8Array(0);
  }

  // Push chunks arriving over BLE (e.g. 20 byte MTU chunks)
  push(chunk) {
    if (!chunk || chunk.length === 0) return [];
    
    const newBuf = new Uint8Array(this.buffer.length + chunk.length);
    newBuf.set(this.buffer);
    newBuf.set(chunk, this.buffer.length);
    this.buffer = newBuf;

    const packets = [];
    let offset = 0;

    while (offset <= this.buffer.length - (HEADER_SIZE + CRC_SIZE)) {
      const isA2D = this.buffer[offset] === SYNC_A2D[0] && this.buffer[offset + 1] === SYNC_A2D[1];
      const isD2A = this.buffer[offset] === SYNC_D2A[0] && this.buffer[offset + 1] === SYNC_D2A[1];
      
      if (!isA2D && !isD2A) {
        offset++;
        continue;
      }
      
      const packetLen = (this.buffer[offset + 3] << 8) | this.buffer[offset + 4];
      const totalLen = 4 + packetLen;
      
      if (offset + totalLen > this.buffer.length) {
        // Fragmented packet, wait for more chunks
        break; 
      }
      
      const remaining = this.buffer.slice(offset, offset + totalLen);
      const pkt = parsePacket(remaining);
      
      if (pkt) {
        packets.push(pkt);
        offset += totalLen;
      } else {
        // Corrupted packet (bad CRC or invalid format)
        // Skip sync marker to allow re-syncing on next valid packet
        offset++; 
      }
    }

    // Keep only the unprocessed remainder
    if (offset > 0) {
      this.buffer = this.buffer.slice(offset);
    }

    return packets;
  }
}

function parseStream(data) {
  const sb = new StreamBuffer();
  return sb.push(data);
}

function interpretPacket(parsed) {
  if (!parsed) return 'Invalid packet';
  switch (parsed.command) {
    case COMMANDS.SET_LED:
      if (parsed.payload[0] === 0x30) return '💡 Set LED: LOW';
      if (parsed.payload[0] === 0x31) return '💡 Set LED: MEDIUM';
      if (parsed.payload[0] === 0x32) return '💡 Set LED: HIGH';
      return `💡 Set LED: Unknown`;
    case COMMANDS.GET_BATTERY:
      if (parsed.direction === 'd2a' && parsed.payload.length >= 2) {
        return `🔋 Battery: ${parsed.payload[0]}%, Charging: ${parsed.payload[1] ? 'ON' : 'OFF'}`;
      }
      return '🔋 Get Battery Request';
    case COMMANDS.TAKE_PHOTO:
      if (parsed.payload[0] === 0x30) return '📷 Take Photo (Standard)';
      if (parsed.payload[0] === 0x31) return '📷 Take Photo (HD Upload)';
      return '📷 Take Photo';
    case COMMANDS.ACTION_SYNC:
      if (parsed.payload.length >= 9) {
        return `⚡ Sync: Photo(${parsed.payload[0]}) Nod(${parsed.payload[5]}) Worn(${parsed.payload[8]})`;
      }
      return '⚡ Action Sync';
    case COMMANDS.CHARGING_STATUS:
      return `🔌 Charging: ${parsed.payload[0] ? 'ON' : 'OFF'} (${parsed.payload[1]}%)`;
    case COMMANDS.SYNC_TIME:
      if (parsed.payload.length >= 7) {
        const p = parsed.payload;
        const year = (p[0] << 8) | p[1];
        return `🕐 Sync Time: ${year}-${String(p[2]).padStart(2,'0')}-${String(p[3]).padStart(2,'0')} ${String(p[4]).padStart(2,'0')}:${String(p[5]).padStart(2,'0')}:${String(p[6]).padStart(2,'0')}`;
      }
      return '🕐 Sync Time';
    default: 
      return `CMD 0x${parsed.command.toString(16).padStart(2,'0')}`;
  }
}

function toHexString(bytes) {
  if (!bytes) return '';
  return Array.from(bytes).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SYNC_A2D, SYNC_D2A, COMMANDS, COMMAND_NAMES,
    HEADER_SIZE, CRC_SIZE, StreamBuffer,
    computeCRC, buildPacket, parsePacket, parseStream,
    interpretPacket, toHexString,
  };
}
