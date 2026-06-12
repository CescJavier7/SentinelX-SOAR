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

<img width="1280" height="663" alt="image" src="https://github.com/user-attachments/assets/9c4daa5e-6f0b-44e1-933d-7a894e28a45a" />

<img width="1280" height="778" alt="image" src="https://github.com/user-attachments/assets/c17a4a2f-696f-4600-baf6-fcaddc6b022e" />

---
## ⚙️ Instalación y Despliegue (Quick Start)

Este proyecto está 100% dockerizado para garantizar su portabilidad. Para desplegar SentinelX en tu entorno local, sigue estos pasos:

### 1. Requisitos Previos

- [Docker](https://www.docker.com/) y Docker Compose instalados.
- Git instalado.
- (Opcional) Una cuenta de Discord para recibir las alertas del SOAR.

### 2. Clonar el Repositorio

```bash
git clone https://github.com/CescJavier7/SentinelX-SOAR.git
cd SentinelX-SOAR
```

### 3. Configuración de Variables de Entorno (Secretos)

Por motivos de seguridad, los secretos no están en el control de versiones. Debes crear tu propio archivo `.env` basado en la plantilla proporcionada:

1. Ve a la carpeta del backend: `cd backend`
2. Copia la plantilla: `cp .env.example .env`
3. Edita el archivo `.env` con tus datos:
   - `UBUNTU_IP`: La IP de la máquina/servidor que deseas proteger.
   - `DISCORD_WEBHOOK_URL`: La URL de tu canal de Discord para el ChatOps (si lo dejas vacío, el sistema omitirá esta notificación sin fallar).

### 4. Generar la Identidad Criptográfica (Zero-Trust)

Para que el SOAR pueda mitigar ataques en el firewall remoto sin usar contraseñas, debes generar una llave SSH Ed25519 y colocarla en la carpeta `backend/secrets/`:

```bash
mkdir secrets
ssh-keygen -t ed25519 -C "sentinelx_bot" -f secrets/id_ed25519 -N ""
```

> **Nota:** Asegúrate de inyectar la llave pública `id_ed25519.pub` en el archivo `authorized_keys` de tu servidor destino.

### 5. Levantar la Infraestructura

Vuelve a la raíz del proyecto y ejecuta el orquestador maestro:

```bash
cd ..
docker compose up --build -d
```

### 6. Acceso al SOC

Una vez que todos los contenedores estén en verde, abre tu navegador y entra al Centro de Operaciones:

👉 [http://localhost:5173](http://localhost:5173)
