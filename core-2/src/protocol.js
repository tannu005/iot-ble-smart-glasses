/**
 *  BLE Protocol — Browser ES module (mirrors core-1/protocol.js)
 *  CRC = (cmd + sum(data)) & 0xFF
 */

export const SYNC = [0xAA, 0x55];
export const HEADER_SIZE = 5;
export const CRC_SIZE = 1;
export const MIN_PACKET_SIZE = HEADER_SIZE + CRC_SIZE;

export const COMMANDS = Object.freeze({
  PHOTO_CAPTURED : 0x01,
  NOD_DETECTED   : 0x02,
  BATTERY_LEVEL  : 0x03,
  CHARGING_STATE : 0x04,
  SET_LED        : 0x05,
  TRIGGER_PHOTO  : 0x06,
  SYNC_TIME      : 0x07,
  ACK            : 0x08,
  ERROR          : 0x09,
});

export const COMMAND_NAMES = Object.freeze(
  Object.fromEntries(Object.entries(COMMANDS).map(([k, v]) => [v, k]))
);

export function computeCRC(cmd, data) {
  let sum = cmd;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum & 0xFF;
}

export function buildPacket(cmd, data = []) {
  try {
    if (cmd == null || typeof cmd !== 'number') return null;
    if (!Array.isArray(data)) return null;
    if (data.length > 0xFFFF || cmd < 0 || cmd > 0xFF) return null;
    const lenLo = data.length & 0xFF;
    const lenHi = (data.length >> 8) & 0xFF;
    const crc = computeCRC(cmd, data);
    return new Uint8Array([...SYNC, cmd, lenLo, lenHi, ...data, crc]);
  } catch (_) { return null; }
}

export function parsePacket(raw) {
  try {
    if (!raw || raw.length < MIN_PACKET_SIZE) return null;
    if (raw[0] !== SYNC[0] || raw[1] !== SYNC[1]) return null;
    const cmd = raw[2];
    const payloadLen = raw[3] | (raw[4] << 8);
    const totalLen = HEADER_SIZE + payloadLen + CRC_SIZE;
    if (raw.length < totalLen) return null;
    const payload = Array.from(raw.slice(HEADER_SIZE, HEADER_SIZE + payloadLen));
    const expected = computeCRC(cmd, payload);
    const received = raw[HEADER_SIZE + payloadLen];
    if (expected !== received) return null;
    return { command: cmd, commandName: COMMAND_NAMES[cmd] || `UNKNOWN_0x${cmd.toString(16).padStart(2,'0')}`, payload, payloadLength: payloadLen, rawLength: totalLen, crc: received, valid: true };
  } catch (_) { return null; }
}

export function interpretPacket(parsed) {
  if (!parsed) return 'Invalid packet';
  switch (parsed.command) {
    case COMMANDS.PHOTO_CAPTURED: return `📷 Photo captured (ID: ${parsed.payload[0] ?? '?'})`;
    case COMMANDS.NOD_DETECTED: { const t = ['single','double','long']; return `🤝 Nod: ${t[parsed.payload[0]] ?? 'unknown'}`; }
    case COMMANDS.BATTERY_LEVEL:  return `🔋 Battery: ${parsed.payload[0] ?? '?'}%`;
    case COMMANDS.CHARGING_STATE: return `⚡ Charging: ${parsed.payload[0] ? 'ON' : 'OFF'}`;
    case COMMANDS.SET_LED:        return `💡 LED → ${parsed.payload[0] ?? '?'}%`;
    case COMMANDS.TRIGGER_PHOTO:  return `📸 Trigger photo`;
    case COMMANDS.SYNC_TIME: {
      if (parsed.payload.length >= 4) {
        const ts = parsed.payload[0]|(parsed.payload[1]<<8)|(parsed.payload[2]<<16)|(parsed.payload[3]<<24);
        return `🕐 Sync: ${new Date(ts*1000).toLocaleTimeString()}`;
      }
      return '🕐 Time sync';
    }
    case COMMANDS.ACK:   return `✅ ACK (0x${(parsed.payload[0]??0).toString(16).padStart(2,'0')})`;
    case COMMANDS.ERROR: { const c={1:'CRC_FAIL',2:'UNKNOWN_CMD',3:'TIMEOUT',4:'BUSY'}; return `❌ ${c[parsed.payload[0]]??'ERROR'}`; }
    default: return `CMD 0x${parsed.command.toString(16).padStart(2,'0')}`;
  }
}

export function toHexString(bytes) {
  if (!bytes) return '';
  return Array.from(bytes).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
}
