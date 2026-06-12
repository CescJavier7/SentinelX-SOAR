import React, { useState, useEffect } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

// Estilos cibernéticos para los nodos
const nodeStyle = { background: '#111827', color: '#fff', border: '1px solid #3b82f6', borderRadius: '4px', padding: '10px', fontSize: '12px', textAlign: 'center', width: 160 };
const attackerStyle = { ...nodeStyle, border: '1px solid #ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)' };
const serverStyle = { ...nodeStyle, border: '1px solid #22c55e' };

export default function ThreatGraph({ latestAlert }) {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    useEffect(() => {
        // Nodos fijos de nuestra infraestructura
        const initialNodes = [
            { id: 'firewall', position: { x: 350, y: 100 }, data: { label: '🛡️ UFW Firewall\n(SentinelX SOAR)' }, style: nodeStyle },
            { id: 'server', position: { x: 650, y: 100 }, data: { label: '🖥️ Ubuntu Server\n192.168.0.102' }, style: serverStyle },
        ];

        if (!latestAlert) {
            setNodes([{ id: 'waiting', position: { x: 50, y: 100 }, data: { label: '📡 Escaneando Red...' }, style: nodeStyle }, ...initialNodes]);
            setEdges([{ id: 'e-fw-server', source: 'firewall', target: 'server', animated: true, style: { stroke: '#22c55e' } }]);
            return;
        }

        const isBypass = latestAlert.status === "BYPASSED_BY_CONTEXT";

        // Nodo del Atacante que cambia dinámicamente
        const attackerNode = {
            id: 'attacker',
            position: { x: 50, y: 100 },
            data: { label: `☠️ ${latestAlert.attacker_ip}\n${latestAlert.cti_flag} ${latestAlert.cti_country}` },
            style: isBypass ? { ...attackerStyle, border: '1px solid #3b82f6', boxShadow: 'none' } : attackerStyle
        };

        // Línea (Láser) del ataque
        const attackEdge = {
            id: 'e-attacker-fw',
            source: 'attacker',
            target: 'firewall',
            animated: true,
            style: { stroke: isBypass ? '#3b82f6' : '#ef4444', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: isBypass ? '#3b82f6' : '#ef4444' }
        };

        // Línea interna (Detenida o Permitida)
        const internalEdge = {
            id: 'e-fw-server',
            source: 'firewall',
            target: 'server',
            animated: isBypass, // Solo se mueve si el contexto lo permite
            style: { stroke: isBypass ? '#3b82f6' : '#52525b', strokeWidth: 3 },
            label: isBypass ? 'ACCESO PERMITIDO' : 'TRÁFICO BLOQUEADO',
            labelStyle: { fill: isBypass ? '#60a5fa' : '#ef4444', fontWeight: 800, fontSize: '10px' },
            markerEnd: { type: MarkerType.ArrowClosed, color: isBypass ? '#3b82f6' : '#52525b' }
        };

        setNodes([attackerNode, ...initialNodes]);
        setEdges([attackEdge, internalEdge]);

    }, [latestAlert]);

    return (
        <div style={{ height: '220px', width: '100%', backgroundColor: '#090d16', border: '1px solid #1f2937', borderRadius: '4px', marginBottom: '24px' }}>
            <ReactFlow nodes={nodes} edges={edges} fitView attributionPosition="bottom-right">
                <Background color="#1f2937" gap={20} size={2} />
                <Controls style={{ fill: '#fff', backgroundColor: '#111827' }} />
            </ReactFlow>
        </div>
    );
}