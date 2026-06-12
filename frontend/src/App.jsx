import React, { useState, useEffect } from 'react';
import { Shield, Server, Terminal, Radio, AlertTriangle, ShieldCheck, Globe, Cpu } from 'lucide-react';
import ThreatGraph from './ThreatGraph';

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, protected: 1, bypassed: 0 });
  const [wsStatus, setWsStatus] = useState("Conectando...");

  const formatTime = (isoString) => {
    if (!isoString || isoString === "Ahora Mismo") return "Ahora Mismo";
    try {
      const date = new Date(isoString);
      return date.toLocaleString(); 
    } catch (e) {
      return isoString;
    }
  };

  useEffect(() => {
    // 1. Carga Histórica Enriquecida
    fetch("http://localhost:8000/api/v1/alerts")
      .then(res => res.json())
      .then(data => {
        setAlerts(data.alerts);
        setMetrics(m => ({ ...m, total: data.total_alerts, bypassed: data.total_bypassed }));
      })
      .catch(err => console.error("Error cargando historial de analítica:", err));

    // 2. Tubería WebSockets de Latencia Cero
    const socket = new WebSocket("ws://localhost:8000/ws/alerts");

    socket.onopen = () => setWsStatus("🟢 SENTINELX CORE LIVE NETWORKING");
    socket.onclose = () => setWsStatus("🔴 PIPELINE OFFLINE - RECONNECTING");
    
    socket.onmessage = (event) => {
      const newAlert = JSON.parse(event.data);
      
      setAlerts(prev => {
        const exists = prev.find(a => a.id === newAlert.id);
        if (exists) return prev; 
        return [newAlert, ...prev].slice(0, 50); 
      });
      
      setMetrics(m => {
        if (newAlert.status === "BYPASSED_BY_CONTEXT") {
          return { ...m, bypassed: m.bypassed + 1 };
        }
        return { ...m, total: m.total + 1 };
      });
    };

    return () => socket.close();
  }, []);

  return (
    <div style={styles.dashboard}>
      {/* HEADER DE CONTROL */}
      <header style={styles.header}>
        <div style={styles.logoArea}>
          <Shield size={32} color="#2563eb" style={{ animation: 'pulse 2s infinite' }} />
          <div>
            <h1 style={styles.title}>SentinelX <span style={styles.versionBadge}>v5.5-Enterprise</span></h1>
            <p style={styles.subtitle}>Autonomous Cyber Threat Orchestration & Detection</p>
          </div>
        </div>
        <div style={styles.wsStatusBadge(wsStatus)}>
          <Radio size={14} style={{ marginRight: 6 }} /> {wsStatus}
        </div>
      </header>

      {/* MÉTRICAS DE OPERACIONES DE SEGURIDAD */}
      <section style={styles.metricsRow}>
        <div style={styles.metricCard('#ef4444')}>
          <div style={styles.cardHeader}><Shield size={16} /> AMENAZAS MITIGADAS</div>
          <p style={styles.metricValue}>{metrics.total}</p>
        </div>
        <div style={styles.metricCard('#3b82f6')}>
          <div style={styles.cardHeader}><AlertTriangle size={16} /> BYPASS DE CONTEXTO</div>
          <p style={styles.metricValue}>{metrics.bypassed}</p>
        </div>
        <div style={styles.metricCard('#22c55e')}>
          <div style={styles.cardHeader}><Server size={16} /> ACTIVOS EN PROTECCIÓN</div>
          <p style={styles.metricValue}>{metrics.protected} <span style={{fontSize: '14px', color:'#a1a1aa'}}>Nodes</span></p>
        </div>
      </section>

      {/* MONITOR PRINCIPAL TIMELINE */}
      <main style={styles.mainContent}>
        <h2 style={styles.sectionTitle}><Terminal size={20} style={{ marginRight: 8, color: '#3b82f6' }} /> REAL-TIME THREAT INTEL TELEMETRY</h2>
        
        {/* 🔥 NUEVO: TOPOLOGÍA INTERACTIVA DE RED 🔥 */}
        <ThreatGraph latestAlert={alerts[0]} />
        
        <div style={styles.timeline}>
          {alerts.length === 0 ? (
            <p style={styles.emptyText}>Escaneando puertos e índices. Esperando logs...</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} style={styles.alertCard(alert.status)}>
                
                {/* FILA SUPERIOR: SEVERIDAD Y TIEMPO LOCAL */}
                <div style={styles.alertHeader}>
                  <span style={styles.severityBadge(alert.severity)}>{alert.severity}</span>
                  <span style={styles.timestamp}>{formatTime(alert.timestamp)}</span>
                </div>
                
                {/* DATOS DEL ATAQUE */}
                <h3 style={styles.attackType}>{alert.attack_type}</h3>
                <p style={styles.attackerIp}>Host Atacante: <span style={styles.ipHighlight}>{alert.attacker_ip}</span></p>
                
                {/* CAJA DE INTELIGENCIA DE AMENAZAS ENRIQUECIDA (CTI) */}
                <div style={styles.ctiBox}>
                  <div style={styles.ctiRow}>
                    <span style={{marginRight: '12px'}}>{alert.cti_flag} <strong>Origen:</strong> {alert.cti_country || "Buscando..."}</span>
                    <span><Cpu size={14} style={{display:'inline', marginRight:'4px'}} /> <strong>ISP Feed:</strong> {alert.cti_isp || "N/A"}</span>
                  </div>
                  
                  {/* BARRA DE RIESGO DE THREAT INTEL */}
                  <div style={{marginTop: '8px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#a1a1aa', marginBottom:'2px'}}>
                      <span>Threat Reputation Score:</span>
                      <span style={{fontWeight:'bold', color: alert.cti_score > 70 ? '#f87171' : '#60a5fa'}}>{alert.cti_score}%</span>
                    </div>
                    <div style={styles.scoreBarContainer}>
                      <div style={styles.scoreBarFill(alert.cti_score)}></div>
                    </div>
                  </div>
                </div>

                {/* PIE DE TARJETA: MITRE Y LOGICA SOAR */}
                <div style={styles.footerRow}>
                  <div style={styles.mitreBox}>
                    <strong>MITRE ATT&CK:</strong> 
                    {alert.mitre_tags.split(',').map(tag => (
                      <span key={tag} style={styles.tag}>{tag.trim()}</span>
                    ))}
                  </div>
                  
                  <div style={styles.statusBadge(alert.status)}>
                    {alert.status === "BYPASSED_BY_CONTEXT" ? (
                      <><Globe size={14} style={{ marginRight: 4 }} /> Context Allowed</>
                    ) : (
                      <><ShieldCheck size={14} style={{ marginRight: 4 }} /> Firewall Blocked</>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// --- ESTILOS VISUALES ENTERPRISE CYBER DEFENSE ---
const styles = {
  dashboard: { backgroundColor: '#090d16', color: '#f4f4f5', minHeight: '100vh', fontFamily: '"Courier New", Courier, monospace', padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1f2937', paddingBottom: '20px', marginBottom: '32px' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '14px' },
  title: { fontSize: '26px', fontWeight: '900', margin: 0, letterSpacing: '1px', color: '#ffffff' },
  versionBadge: { fontSize: '11px', backgroundColor: '#1e3a8a', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px' },
  subtitle: { color: '#71717a', fontSize: '13px', margin: '4px 0 0 0' },
  wsStatusBadge: (status) => ({
    display: 'flex', alignItems: 'center', backgroundColor: status.includes("🟢") ? '#022c22' : '#450a0a',
    color: status.includes("🟢") ? '#34d399' : '#f87171', padding: '8px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: `1px solid ${status.includes("🟢") ? '#065f46' : '#991b1b'}`
  }),
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' },
  metricCard: { backgroundColor: '#111827', border: '1px solid #1f2937', padding: '20px', borderRadius: '4px', position: 'relative' },
  metricCard: (accentColor) => ({
    backgroundColor: '#111827', border: '1px solid #1f2937', borderTop: `4px solid ${accentColor}`, padding: '20px', borderRadius: '4px'
  }),
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' },
  metricValue: { fontSize: '36px', fontWeight: 'bold', margin: '12px 0 0 0', color: '#ffffff' },
  mainContent: { maxWidth: '1100px', margin: '0 auto' },
  sectionTitle: { display: 'flex', alignItems: 'center', fontSize: '20px', color: '#e4e4e7', marginBottom: '20px', letterSpacing: '1px' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '16px' },
  alertCard: (status) => ({
    backgroundColor: '#111827', border: '1px solid #1f2937', borderLeft: `6px solid ${status === "BYPASSED_BY_CONTEXT" ? '#2563eb' : '#dc2626'}`,
    padding: '20px', borderRadius: '4px'
  }),
  alertHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  severityBadge: (sev) => ({
    backgroundColor: sev === 'CRITICAL' ? '#450a0a' : '#172554', color: sev === 'CRITICAL' ? '#f87171' : '#60a5fa',
    padding: '4px 10px', borderRadius: '2px', fontSize: '11px', fontWeight: 'bold', border: `1px solid ${sev === 'CRITICAL' ? '#991b1b' : '#1e3a8a'}`
  }),
  timestamp: { color: '#52525b', fontSize: '12px' },
  attackType: { fontSize: '18px', margin: '0 0 6px 0', fontWeight: 'bold', color: '#ffffff' },
  attackerIp: { color: '#a1a1aa', fontSize: '14px', margin: '0 0 16px 0' },
  ipHighlight: { color: '#3b82f6', fontWeight: 'bold', backgroundColor: '#1e3a8a33', padding: '2px 6px', borderRadius: '2px' },
  ctiBox: { backgroundColor: '#090d16', border: '1px solid #1f2937', padding: '12px', borderRadius: '2px', marginBottom: '16px', fontSize: '13px' },
  ctiRow: { display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#d4d4d8' },
  scoreBarContainer: { width: '100%', height: '6px', backgroundColor: '#1f2937', borderRadius: '3px', overflow: 'hidden' },
  scoreBarFill: (score) => ({ width: `${score}%`, height: '100%', backgroundColor: score > 70 ? '#ef4444' : '#3b82f6', transition: 'width 0.5s ease-in-out' }),
  footerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1f2937', paddingTop: '14px' },
  mitreBox: { fontSize: '12px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '8px' },
  tag: { backgroundColor: '#172554', color: '#60a5fa', padding: '2px 8px', borderRadius: '2px', fontSize: '11px', border: '1px solid #1e3a8a' },
  statusBadge: (status) => ({
    display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 'bold',
    color: status === "BYPASSED_BY_CONTEXT" ? '#60a5fa' : '#34d399'
  }),
  emptyText: { color: '#52525b', textAlign: 'center', padding: '24px', fontStyle: 'italic' }
};