# 🛡️ SentinelX-SOAR: Autonomous DevSecOps & SOC Platform


## 📖 Visión General
SentinelX es una plataforma de Orquestación, Automatización y Respuesta de Seguridad (SOAR) construida desde cero. Diseñada para cerrar la brecha entre la detección de amenazas y la mitigación táctica, SentinelX monitoriza redes y sistemas en tiempo real, evalúa el riesgo usando Inteligencia de Amenazas (CTI) simulada, y neutraliza ataques en milisegundos sin intervención humana.

## 🏗️ Arquitectura del Sistema (5 Capas)
1. **Sensores de Detección (NIDS/HIDS):** - **Suricata:** Análisis profundo de paquetes (DPI) para cazar tácticas de reconocimiento (Ping/Escaneos de red).
   - **Filebeat:** Recolección de logs de autenticación (SSH Brute Force).
2. **Data Pipeline & SIEM:** Elasticsearch y Kibana para almacenamiento forense y correlación de eventos.
3. **Detection Engineering Engine:** Motor basado en Python que parsea logs crudos (Regex) y evalúa reglas Sigma mapeadas al framework MITRE ATT&CK.
4. **SOAR & Orchestration (FastAPI + Redis):**
   - **Zero-Trust Mitigation:** Ejecución de playbooks de contención en el Firewall (UFW) mediante criptografía de curva elíptica (SSH Ed25519), eliminando el uso de contraseñas estáticas.
   - **Alert Deduplication:** Caché en Redis para suprimir alertas duplicadas ("Alert Fatigue") y manejar condiciones de carrera entre múltiples vectores de ataque simultáneos.
5. **ChatOps & Visualización (React + Discord):** - Notificaciones Webhook formateadas para analistas de Nivel 1.
   - **Topología de Amenazas Interactiva:** Dashboard en React (Vite + ReactFlow) que renderiza el flujo del ataque y el estado de la red en vivo mediante WebSockets.

## 🚀 Características Enterprise
- **Passwordless Automation:** Hardening de infraestructura mediante llaves asimétricas.
- **Dynamic Risk Scoring:** Enriquecimiento de telemetría (GeoIP/ISP) para priorización de incidentes.
- **Asynchronous Workflows:** Workers en segundo plano (FastAPI BackgroundTasks) para evitar el agotamiento de recursos durante ataques DDoS.
- **Full Dockerization:** Despliegue de infraestructura inmutable mediante `docker-compose`.

