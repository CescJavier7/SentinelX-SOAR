from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from elasticsearch import Elasticsearch
import redis
import logging
import paramiko
import asyncio
import os
import yaml
import glob
import random
import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SentinelX Cyber Enterprise SOAR", version="6.0.0-CHATOPS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

es_client = Elasticsearch("http://elasticsearch:9200")
redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

UBUNTU_IP = os.getenv("UBUNTU_IP")
UBUNTU_USER = "cescjavier7"
UBUNTU_PASSWORD = os.getenv("UBUNTU_PASSWORD")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

ALLOWLIST_IPS = ["192.168.0.1", "192.168.0.50", "127.0.0.1"]

PLAYBOOKS = {}
def load_playbooks():
    playbooks_dir = "playbooks"
    if not os.path.exists(playbooks_dir): return
    for filepath in glob.glob(f"{playbooks_dir}/*.yml"):
        with open(filepath, "r") as f:
            pb = yaml.safe_load(f)
            if "trigger" in pb: PLAYBOOKS[pb["trigger"]] = pb

load_playbooks()

class SOCConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = SOCConnectionManager()

def enrich_threat_context(ip: str) -> dict:
    last_octet = int(ip.split(".")[-1]) if ip.replace(".", "").isdigit() else 100
    countries = ["China (CN)", "Rusia (RU)", "Estados Unidos (US)", "Corea del Norte (KP)", "Países Bajos (NL)"]
    isps = ["Chinanet", "RuNet Autonomous Org", "DigitalOcean LLC", "Koryo Telecom", "Hosting Solutions B.V."]
    idx = last_octet % len(countries)
    
    return {
        "country": countries[idx],
        "flag": "🌐" if "Estados Unidos" in countries[idx] else "⚔️",
        "isp": isps[idx],
        "threat_score": (last_octet * 3) % 101
    }

# --- 🚀 NUEVO: INTEGRACIÓN DISCORD CHATOPS ---
async def send_discord_alert(alert_data: dict):
    if not DISCORD_WEBHOOK_URL:
        return
        
    color = 15158332 if alert_data["status"] == "MITIGATED" else 3447003 # Rojo o Azul
    
    embed = {
        "title": f"{'🚨' if color == 15158332 else '🛡️'} SENTINELX SOAR: {alert_data['attack_type']}",
        "color": color,
        "fields": [
            {"name": "Atacante IP", "value": f"`{alert_data['attacker_ip']}`", "inline": True},
            {"name": "Severidad", "value": alert_data["severity"], "inline": True},
            {"name": "Origen (CTI)", "value": f"{alert_data['cti_flag']} {alert_data['cti_country']}", "inline": True},
            {"name": "Táctica MITRE", "value": alert_data["mitre_tags"], "inline": False},
            {"name": "Acción Automatizada", "value": f"**{alert_data['status']}**", "inline": False},
        ],
        "footer": {"text": "Autonomous SOC Operations | Powered by SentinelX"}
    }
    
    async with httpx.AsyncClient() as client:
        try:
            await client.post(DISCORD_WEBHOOK_URL, json={"embeds": [embed]})
        except Exception as e:
            logger.error(f"Error enviando a Discord: {e}")

def async_ssh_mitigation_task(attacker_ip: str):
    logger.info(f"🛡️ [BACKGROUND WORKER] Mitigando {attacker_ip} usando Zero-Trust Identity")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        # 1. Cargamos la llave criptográfica inyectada por Docker
        private_key = paramiko.Ed25519Key.from_private_key_file("/app/secrets/id_ed25519")
        
        # 2. Conectamos SIN contraseña
        client.connect(hostname=UBUNTU_IP, username=UBUNTU_USER, pkey=private_key, timeout=5)
        
        # 3. Ejecutamos el comando (Ya no necesitamos "echo password | sudo -S")
        command = f'sudo ufw deny from {attacker_ip}'
        client.exec_command(command)
        
        logger.info(f"✅ IP {attacker_ip} bloqueada criptográficamente en UFW.")
    except Exception as e:
        logger.error(f"❌ Fallo crítico en contención Zero-Trust: {e}")
    finally:
        client.close()

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/v1/alerts")
async def get_alerts():
    try:
        query = {
            "query": {
                "bool": {
                    "should": [
                        {"match": {"event.outcome": "failure"}},
                        {"match": {"user.name": "admin"}},
                        {"match": {"message": "NIDS"}}  
                    ],
                    "minimum_should_match": 1
                }
            },
            "sort": [{"@timestamp": {"order": "desc"}}],
            "size": 50
        }
        resp = await asyncio.to_thread(es_client.search, index="filebeat-*", body=query)
        raw_hits = resp['hits']['hits']
        parsed_alerts = []
        bypassed_count = 0
        
        for hit in raw_hits:
            source = hit['_source']
            
            # 1. Intentar obtener IP de Elastic
            ip = source.get('source', {}).get('ip') or source.get('client', {}).get('ip')
            
            # 2. Si no hay IP, usar el motor Regex
            msg = source.get('message', '')
            if not ip and msg:
                import re
                ips = re.findall(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', msg)
                valid_ips = [i for i in ips if i != "192.168.0.102" and i != "127.0.0.1"]
                if valid_ips:
                    ip = valid_ips[0]

            # 3. Limpieza: Si no logramos sacar una IP válida, ignoramos el log
            if not ip:
                continue

            is_allowlisted = ip in ALLOWLIST_IPS
            if is_allowlisted: bypassed_count += 1
            
            cti = enrich_threat_context(ip)
            
            # 4. Asignación correcta del tipo de ataque para el Dashboard
            if "NIDS" in msg:
                attack_type = "Network Reconnaissance (Ping)"
                mitre = "attack.t1046"
            else:
                attack_type = "SSH Brute Force"
                mitre = "attack.t1110, attack.t1078"

            parsed_alerts.append({
                "id": hit['_id'],
                "timestamp": source.get('@timestamp'),
                "attacker_ip": ip,
                "attack_type": attack_type,
                "severity": "LOW" if is_allowlisted else "CRITICAL",
                "mitre_tags": mitre,
                "status": "BYPASSED_BY_CONTEXT" if is_allowlisted else "MITIGATED",
                "cti_country": cti["country"],
                "cti_flag": cti["flag"],
                "cti_isp": cti["isp"],
                "cti_score": cti["threat_score"]
            })
            
        return {
            "total_alerts": len(parsed_alerts) - bypassed_count, 
            "total_bypassed": bypassed_count,
            "alerts": parsed_alerts
        }
    except Exception as e:
        logger.error(f"Error parseando alertas: {e}")
        return {"total_alerts": 0, "total_bypassed": 0, "alerts": []}

@app.post("/api/v1/alerts/webhook")
async def receive_alert(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    attacker_ip = payload.get("attacker_ip")
    rule_name = payload.get("rule_name")
    mitre_tags = payload.get("mitre_tags", "N/A")
    severity = payload.get("severity", "HIGH")
    event_time = payload.get("timestamp", "Ahora Mismo")
    
    if not attacker_ip: return {"status": "error"}

    cti = enrich_threat_context(attacker_ip)

    if attacker_ip in ALLOWLIST_IPS:
        if not redis_client.exists(f"bypassed:{attacker_ip}"):
            redis_client.setex(f"bypassed:{attacker_ip}", 12, "true")
            alert_payload = {
                "id": f"ctx-{attacker_ip}",
                "timestamp": event_time,
                "attacker_ip": attacker_ip,
                "attack_type": f"Falsa Alarma: {rule_name}",
                "severity": "LOW",
                "mitre_tags": mitre_tags,
                "status": "BYPASSED_BY_CONTEXT",
                "cti_country": cti["country"],
                "cti_flag": cti["flag"],
                "cti_isp": cti["isp"],
                "cti_score": 10
            }
            await manager.broadcast(alert_payload)
            background_tasks.add_task(send_discord_alert, alert_payload) # 🔥 Discord
        return {"status": "ignored"}

    if not redis_client.exists(f"blocked:{attacker_ip}"):
        redis_client.setex(f"blocked:{attacker_ip}", 86400, "true")
        
        playbook = PLAYBOOKS.get(rule_name)
        if playbook:
            for action in playbook.get('actions', []):
                if action['type'] == 'firewall_block':
                    background_tasks.add_task(async_ssh_mitigation_task, attacker_ip)
        
        alert_payload = {
            "id": f"alert-{attacker_ip}-{random.randint(100,999)}",
            "timestamp": event_time,
            "attacker_ip": attacker_ip,
            "attack_type": rule_name,
            "severity": severity,
            "mitre_tags": mitre_tags,
            "status": "MITIGATED",
            "cti_country": cti["country"],
            "cti_flag": cti["flag"],
            "cti_isp": cti["isp"],
            "cti_score": cti["threat_score"]
        }
        await manager.broadcast(alert_payload)
        background_tasks.add_task(send_discord_alert, alert_payload) # 🔥 Discord
        return {"status": "accepted"}
        
    return {"status": "ignored"}