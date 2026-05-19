import { useState, useRef, useCallback, useEffect } from 'react';
import { buildPacket, parsePacket, COMMANDS, interpretPacket, toHexString } from './protocol';

/* ═══════════════════════════════════════════════════════════════
   Chaos Engine — corrupt 10 % of packets
   ═══════════════════════════════════════════════════════════════ */
function chaosCorrupt(packet) {
  const copy = new Uint8Array(packet);
  const methods = ['flip_byte', 'truncate', 'bad_crc'];
  const method = methods[Math.floor(Math.random() * methods.length)];
  switch (method) {
    case 'flip_byte': { const i = 2 + Math.floor(Math.random() * (copy.length - 2)); copy[i] ^= (1 << Math.floor(Math.random() * 8)); return { data: copy, method: `Bit-flip @ byte ${i}` }; }
    case 'truncate': { const cut = Math.max(4, copy.length - 1 - Math.floor(Math.random() * 3)); return { data: copy.slice(0, cut), method: `Truncated → ${cut}B` }; }
    case 'bad_crc': copy[copy.length - 1] ^= 0xFF; return { data: copy, method: 'CRC corrupted' };
    default: return { data: copy, method: null };
  }
}

/* ═══════════════════════════════════════════════════════════════
   Hex formatter with color spans
   ═══════════════════════════════════════════════════════════════ */
function ColoredHex({ bytes, parsed }) {
  if (!bytes || !bytes.length) return <span className="pl">empty</span>;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase());
  const parts = [];
  if (hex.length >= 2) parts.push(<span key="sy" className="sy">{hex.slice(0, 2).join(' ')}</span>);
  if (hex.length >= 3) parts.push(<span key="cm" className="cm"> {hex[2]}</span>);
  if (hex.length >= 5) parts.push(<span key="ln" className="ln"> {hex.slice(3, 5).join(' ')}</span>);
  if (parsed && parsed.payloadLength > 0) parts.push(<span key="pl" className="pl"> {hex.slice(5, 5 + parsed.payloadLength).join(' ')}</span>);
  else if (hex.length > 5) parts.push(<span key="pl" className="pl"> {hex.slice(5, hex.length > 6 ? hex.length - 1 : hex.length).join(' ')}</span>);
  if (parsed || hex.length >= 6) parts.push(<span key="cr" className="cr"> {hex[hex.length - 1]}</span>);
  return <>{parts}</>;
}

/* ═══════════════════════════════════════════════════════════════
   Custom Cursor Component
   ═══════════════════════════════════════════════════════════════ */
function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      const target = e.target;
      const isClickable = target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.tagName === 'INPUT';
      setIsHovering(isClickable);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className={`custom-cursor ${isHovering ? 'hovering' : ''}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   Cinematic Hero Component (Pure CSS Mesh)
   ═══════════════════════════════════════════════════════════════ */
function CinematicHero() {
  return (
    <div className="hero-container">
      <div className="hero-video-wrapper"></div>
      
      <div className="hero-content">
        <div className="hero-title-layer">
          <div className="hero-title-outline">GlassLink G1</div>
          <div className="hero-title-solid">GlassLink G1</div>
        </div>
        <div className="hero-subtitle">
          Next-Gen AI Wearable Simulator
        </div>
      </div>
      
      <div className="scroll-prompt">
        <span>Scroll to Interact</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   App
   ═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [device, setDevice] = useState({ battery: 85, charging: false, ledBrightness: 50, photoCount: 0, nodCount: 0, worn: 1 });
  const [appSt, setAppSt] = useState({ battery: 85, charging: false, lastPhoto: null, nodCount: 0, timeSynced: false, led: 50 });
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState({ sent: 0, recv: 0, errors: 0 });
  
  const [chaos, setChaos] = useState(false);
  const [autoSim, setAutoSim] = useState(false);
  const [ledVal, setLedVal] = useState(50);
  const [flashActive, setFlashActive] = useState(false);
  
  const startTime = useRef(Date.now());
  const [uptime, setUptime] = useState('0s');
  const logRef = useRef(null);
  const idRef = useRef(0);

  // Uptime tick
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Battery drain
  useEffect(() => {
    const t = setInterval(() => {
      setDevice(d => ({ ...d, battery: d.charging ? Math.min(100, d.battery + 2) : Math.max(5, d.battery - 1) }));
    }, 8000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll log
  useEffect(() => { 
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const flashState = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 600); }
  }, []);
  
  const popStat = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); setTimeout(() => el.classList.remove('up'), 400); }
  }, []);

  const triggerCameraFlash = useCallback(() => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 50);
  }, []);

  // ── Transmit Core ────────────────────────────────────────────
  const transmitOverAir = useCallback((dir, rawPkt, onReceiveCallback) => {
    if (!rawPkt) return;
    let data = rawPkt, errorMethod = null;
    if (chaos && Math.random() < 0.10) {
      const c = chaosCorrupt(rawPkt);
      data = c.data; errorMethod = c.method;
    }
    const parsed = parsePacket(data);
    const now = new Date();
    const ts = now.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    
    const expectedDir = parsed ? parsed.direction : dir;
    const isError = (!parsed || expectedDir !== dir);

    const entry = { id: ++idRef.current, ts, dir, raw: data, parsed: isError ? null : parsed, error: errorMethod || (isError ? "Malformed Packet" : null) };

    setLog(prev => [...prev.slice(-199), entry]);
    setStats(s => !isError
      ? (dir === 'd2a' ? { ...s, recv: s.recv + 1 } : { ...s, sent: s.sent + 1 })
      : { ...s, errors: s.errors + 1 });

    if (!isError && onReceiveCallback) {
      setTimeout(() => onReceiveCallback(parsed), 50);
    }
  }, [chaos]);

  // ── Device -> App Pipeline ──────────────────────────────────────
  const handleAppReceive = useCallback((parsed) => {
    switch (parsed.command) {
      case COMMANDS.ACTION_SYNC:
        if (parsed.payload[0] > 0) {
          setAppSt(a => ({ ...a, lastPhoto: new Date().toLocaleTimeString() })); 
          flashState('sr-photo');
        }
        if (parsed.payload[5] > 0) {
          setAppSt(a => ({ ...a, nodCount: a.nodCount + parsed.payload[5] })); 
          flashState('sr-nod');
        }
        break;
      case COMMANDS.CHARGING_STATUS:
        setAppSt(a => ({ ...a, charging: parsed.payload[0] > 0, battery: parsed.payload[1] }));
        flashState('sr-chg');
        flashState('sr-bat');
        break;
      case COMMANDS.GET_BATTERY:
        setAppSt(a => ({ ...a, battery: parsed.payload[0], charging: parsed.payload[1] > 0 }));
        flashState('sr-bat');
        break;
      default: break;
    }
  }, [flashState]);

  // ── App -> Device Pipeline ──────────────────────────────────────
  const handleDeviceReceive = useCallback((parsed) => {
    switch (parsed.command) {
      case COMMANDS.SET_LED: {
        const val = parsed.payload[0] === 0x32 ? 100 : (parsed.payload[0] === 0x31 ? 50 : 0);
        setDevice(d => ({ ...d, ledBrightness: val }));
        popStat('stat-led-val');
        break;
      }
      case COMMANDS.TAKE_PHOTO:
        // App commanded device to take a photo. Device takes it.
        triggerCameraFlash();
        setDevice(d => { 
          const next = { ...d, photoCount: d.photoCount + 1 };
          const syncPkt = buildPacket('d2a', COMMANDS.ACTION_SYNC, [1, 0, 0, 0, 0, 0, 0, 0, next.worn]);
          setTimeout(() => transmitOverAir('d2a', syncPkt, handleAppReceive), 200);
          return next; 
        });
        popStat('stat-photo-val');
        break;
      case COMMANDS.GET_BATTERY:
        setDevice(d => {
          const reply = buildPacket('d2a', COMMANDS.GET_BATTERY, [d.battery, d.charging ? 1 : 0]);
          setTimeout(() => transmitOverAir('d2a', reply, handleAppReceive), 100);
          return d;
        });
        break;
      case COMMANDS.SYNC_TIME:
        break;
      default: break;
    }
  }, [transmitOverAir, handleAppReceive, popStat, triggerCameraFlash]);

  // ── UI Actions (Device side) ──────────────────────────────────────
  const devicePhoto = useCallback(() => {
    triggerCameraFlash();
    setDevice(d => { const n = d.photoCount + 1; return { ...d, photoCount: n }; });
    popStat('stat-photo-val');
    const pkt = buildPacket('d2a', COMMANDS.ACTION_SYNC, [1, 0, 0, 0, 0, 0, 0, 0, device.worn]);
    transmitOverAir('d2a', pkt, handleAppReceive);
  }, [device.worn, transmitOverAir, handleAppReceive, popStat, triggerCameraFlash]);

  const deviceNod = useCallback(() => {
    const nodType = 1 + Math.floor(Math.random() * 2); 
    setDevice(d => ({ ...d, nodCount: d.nodCount + nodType }));
    popStat('stat-nod-val');
    const pkt = buildPacket('d2a', COMMANDS.ACTION_SYNC, [0, 0, 0, 0, 0, nodType, 0, 0, device.worn]);
    transmitOverAir('d2a', pkt, handleAppReceive);
  }, [device.worn, transmitOverAir, handleAppReceive, popStat]);

  const deviceCharge = useCallback(() => {
    const next = !device.charging;
    setDevice(d => ({ ...d, charging: next }));
    const pkt = buildPacket('d2a', COMMANDS.CHARGING_STATUS, [next ? 1 : 0, device.battery]);
    transmitOverAir('d2a', pkt, handleAppReceive);
  }, [device.battery, device.charging, transmitOverAir, handleAppReceive]);

  // ── UI Actions (App side) ──────────────────────────────────────
  const appSetLED = useCallback((v) => {
    let mode = 0x30; 
    if (v > 33) mode = 0x31; 
    if (v > 66) mode = 0x32; 
    
    setAppSt(a => ({ ...a, led: v }));
    transmitOverAir('a2d', buildPacket('a2d', COMMANDS.SET_LED, [mode]), handleDeviceReceive);
  }, [transmitOverAir, handleDeviceReceive]);

  const appCapture = useCallback(() => {
    transmitOverAir('a2d', buildPacket('a2d', COMMANDS.TAKE_PHOTO, [0x30]), handleDeviceReceive);
  }, [transmitOverAir, handleDeviceReceive]);
  
  const appGetBattery = useCallback(() => {
    transmitOverAir('a2d', buildPacket('a2d', COMMANDS.GET_BATTERY, []), handleDeviceReceive);
  }, [transmitOverAir, handleDeviceReceive]);

  const appSyncTime = useCallback(() => {
    const d = new Date();
    const y = d.getFullYear();
    const pl = [ (y >> 8) & 0xFF, y & 0xFF, d.getMonth()+1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() ];
    transmitOverAir('a2d', buildPacket('a2d', COMMANDS.SYNC_TIME, pl), handleDeviceReceive);
    setAppSt(a => ({ ...a, timeSynced: true })); flashState('sr-sync');
  }, [transmitOverAir, handleDeviceReceive, flashState]);

  // Auto-Simulate Engine
  useEffect(() => {
    if (!autoSim) return;
    const actions = [devicePhoto, deviceNod, deviceCharge, appCapture, appGetBattery, appSyncTime];
    const t = setInterval(() => {
      if (Math.random() > 0.2) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        action();
      }
    }, 3500);
    return () => clearInterval(t);
  }, [autoSim, devicePhoto, deviceNod, deviceCharge, appCapture, appGetBattery, appSyncTime]);

  const ripple = (e) => { 
    const el = e.currentTarget; 
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);
    el.classList.remove('pop'); 
    void el.offsetWidth; 
    el.classList.add('pop'); 
  };

  return (
    <>
      <div className={`camera-flash ${flashActive ? 'active' : ''}`} />
      <CustomCursor />
      
      {/* Cinematic Masked Video Hero */}
      <CinematicHero />

      <div id="simulator-section">
        {/* ═══ Header ═══ */}
        <header className="header">
          <div className="header-left">
            <div className="logo-icon">
              <svg viewBox="0 0 32 32" width="24" height="24" fill="none"><rect x="2" y="10" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="20" y="10" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M12 14h8" stroke="currentColor" strokeWidth="2"/><circle cx="7" cy="14" r="2" fill="currentColor"/><circle cx="25" cy="14" r="2" fill="currentColor"/></svg>
            </div>
            <div className="header-title"><h1>BLE Smart Glasses</h1><span className="subtitle">Live Device Simulator</span></div>
          </div>
          
          <div className="header-right">
            <div className="conn-badge" style={{marginRight: 10}}><span className="pulse-dot" /><span className="conn-text">Connected</span></div>
            <button className={`auto-sim-btn${autoSim ? ' active' : ''}`} onClick={() => setAutoSim(a => !a)} title="Generate random traffic">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Auto Simulate
            </button>
            <button className={`chaos-btn${chaos ? ' active' : ''}`} onClick={() => setChaos(c => !c)} title="Corrupt 10% of packets randomly">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Chaos Mode
            </button>
          </div>
        </header>

        {/* ═══ Grid ═══ */}
        <main className="main-grid">

          {/* ── Device Panel ── */}
          <section className="panel device-panel">
            <div className="panel-hdr"><div className="p-icon device">🕶️</div><h2>Smart Glasses</h2><span className="p-badge device">DEVICE</span></div>
            <div className="panel-body">
              
              <div className="battery-display">
                <div className="battery-shell">
                  <div className={`battery-fill ${device.battery <= 20 ? 'low' : 'ok'} ${device.charging ? 'charging' : ''}`} style={{ width: `${device.battery}%` }} />
                  <div className="battery-tip" />
                </div>
                <div className="battery-info">
                  <span className="battery-pct">{device.battery}%</span>
                  <span className="battery-lbl">{device.charging ? 'Charging' : 'Discharging'}</span>
                </div>
              </div>

              <div className="action-group">
                <div className="group-label">Sensors & Events</div>
                <button className="action-btn" onClick={(e) => { ripple(e); devicePhoto(); }}><span className="btn-icon">📷</span> Capture Photo</button>
                <button className="action-btn" onClick={(e) => { ripple(e); deviceNod(); }}><span className="btn-icon">🤝</span> Detect Head Nod</button>
                <button className="action-btn" onClick={(e) => { ripple(e); deviceCharge(); }}><span className="btn-icon">⚡</span> Toggle Charging</button>
              </div>

              <div className="stats-grid">
                <div className="stat-card"><span className="stat-val" id="stat-photo-val">{device.photoCount}</span><span className="stat-lbl">Photos</span></div>
                <div className="stat-card"><span className="stat-val" id="stat-nod-val">{device.nodCount}</span><span className="stat-lbl">Nods</span></div>
                <div className="stat-card"><span className="stat-val" id="stat-led-val">{device.ledBrightness}%</span><span className="stat-lbl">LED</span></div>
              </div>
            </div>
          </section>

          {/* ── Packet Log ── */}
          <section className="panel log-panel">
            <div className="panel-hdr">
              <div className="p-icon log">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h2>Packet Log</h2>
              <div className="log-controls">
                <button className="icon-btn" onClick={() => { setLog([]); setStats({ sent: 0, recv: 0, errors: 0 }); }} title="Clear Log">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
            <div className="log-body" ref={logRef}>
              {log.length === 0 && 
                <div className="log-empty">
                  <span className="empty-icon">📡</span>
                  <span className="empty-text">Awaiting BLE Traffic</span>
                  <span className="empty-hint">Interact with the panels to generate packets</span>
                </div>
              }
              {log.map(e => (
                <div key={e.id} className={`log-entry ${e.dir}${e.error ? ' err' : ''}`}>
                  <div className="log-r1">
                    <span className="log-time">{e.ts}</span>
                    <span className={`log-arrow ${e.error ? 'err' : e.dir === 'd2a' ? 'recv' : 'send'}`}>{e.error ? '✗' : e.dir === 'd2a' ? '←' : '→'}</span>
                    <span className="log-cmd">{e.parsed ? e.parsed.commandName : 'CORRUPTED'}</span>
                    <span className="log-interp">{e.parsed ? interpretPacket(e.parsed) : (e.error || 'Parse failed')}</span>
                  </div>
                  <div className="log-r2"><span className="log-hex"><ColoredHex bytes={e.raw} parsed={e.parsed} /></span></div>
                  {e.error && <div className="log-err-detail">⚠ {e.error}</div>}
                </div>
              ))}
            </div>
            <div className="log-footer">
              <div className="log-stats-wrap">
                <span className="log-stat"><span className="dot s" /> App Tx: <b>{stats.sent}</b></span>
                <span className="log-stat"><span className="dot r" /> Dev Tx: <b>{stats.recv}</b></span>
                <span className="log-stat" style={stats.errors > 0 ? {color: 'var(--rose)'} : {}}><span className="dot e" /> Err: <b>{stats.errors}</b></span>
              </div>
              <span className="log-stat">Uptime: <b>{uptime}</b></span>
            </div>
          </section>

          {/* ── App Panel ── */}
          <section className="panel app-panel">
            <div className="panel-hdr"><div className="p-icon appicon">📱</div><h2>Companion App</h2><span className="p-badge appbadge">APP</span></div>
            <div className="panel-body">
              <div className="state-group">
                <div className="group-label">Mirrored State</div>
                <div className="state-row" id="sr-bat">
                  <span className="state-key">🔋 Battery</span>
                  <span className={`state-val ${appSt.charging ? 'charging' : ''}`}>{appSt.battery}% {appSt.charging ? '⚡' : ''}</span>
                </div>
                <div className="state-row" id="sr-photo">
                  <span className="state-key">📷 Last Photo</span>
                  <span className="state-val">{appSt.lastPhoto || '—'}</span>
                </div>
                <div className="state-row" id="sr-nod">
                  <span className="state-key">🤝 Nod Count</span>
                  <span className="state-val">{appSt.nodCount}</span>
                </div>
                <div className="state-row" id="sr-sync">
                  <span className="state-key">🕐 Time Synced</span>
                  <span className={`state-val ${appSt.timeSynced ? 'synced' : ''}`}>{appSt.timeSynced ? 'Yes ✓' : 'No'}</span>
                </div>
              </div>

              <div className="action-group">
                <div className="group-label">Remote Controls</div>
                
                <div className="slider-ctl">
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                    <label style={{marginBottom: 0}}>💡 LED Brightness</label>
                    <span className="slider-val">{ledVal}%</span>
                  </div>
                  <div className="slider-row">
                    <input 
                      type="range" min="0" max="100" value={ledVal} 
                      style={{backgroundSize: `${ledVal}% 100%`}}
                      onChange={e => setLedVal(+e.target.value)} 
                      onMouseUp={() => appSetLED(ledVal)} 
                      onTouchEnd={() => appSetLED(ledVal)} 
                    />
                  </div>
                </div>
                
                <button className="action-btn" onClick={(e) => { ripple(e); appCapture(); }}><span className="btn-icon">📸</span> Trigger Camera</button>
                <button className="action-btn" onClick={(e) => { ripple(e); appGetBattery(); }}><span className="btn-icon">🔋</span> Request Battery</button>
                <button className="action-btn" onClick={(e) => { ripple(e); appSyncTime(); }}><span className="btn-icon">🕐</span> Sync Local Time</button>
              </div>

              <div className="last-pkt" style={{marginTop: 'auto'}}>
                <div className="group-label">Last Packet Received</div>
                <div className={`last-pkt-body${log.length ? ' hl' : ''}`}>
                  {log.length === 0 ? <span style={{ opacity: .5 }}>Awaiting data...</span>
                    : (() => { 
                        const last = log[log.length - 1]; 
                        return last.parsed
                          ? <div style={{width: '100%'}}>
                              <div style={{ fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>
                                <span className={`last-pkt-dir ${last.dir === 'd2a' ? 'recv' : 'send'}`}>
                                  {last.dir === 'd2a' ? '←' : '→'}
                                </span>
                                {last.parsed.commandName}
                              </div>
                              <div style={{ color: 'var(--text-3)', fontSize: '.75rem', wordBreak: 'break-all' }}>
                                {toHexString(last.raw).substring(0, 40)}{last.raw.length > 13 ? '...' : ''}
                              </div>
                            </div>
                          : <span style={{ color: 'var(--rose-light)' }}>✗ Corrupted Payload ({last.raw.length}B)</span>;
                    })()}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
