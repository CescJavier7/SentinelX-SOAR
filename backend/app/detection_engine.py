import httpx
import asyncio
import logging
import yaml
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FIX DOCKER NETWORKING: Cambiamos localhost por los nombres de los servicios
ELASTICSEARCH_URL = "http://elasticsearch:9200/filebeat-*/_search"
SOAR_WEBHOOK_URL = "http://backend:8000/api/v1/alerts/webhook"

def load_rules():
    rules = []
    rules_dir = "rules"
    if not os.path.exists(rules_dir):
        logger.error(f"❌ No se encontró el directorio de reglas: {rules_dir}")
        return rules
    for filename in os.listdir(rules_dir):
        if filename.endswith((".yml", ".yaml")):
            with open(os.path.join(rules_dir, filename), "r") as f:
                rules.append(yaml.safe_load(f))
    return rules

async def check_rule(client, rule):
    condition_field = list(rule['detection']['condition'].keys())[0]
    condition_value = rule['detection']['condition'][condition_field]
    mitre_tags = ", ".join(rule.get('tags', []))

    query = {
        "query": {
            "bool": {
                "must": [
                    {"match": {condition_field: condition_value}}, # Usamos match estándar
                    {"range": {"@timestamp": {"gte": "now-10m"}}}  
                ]
            }
        },
        "size": 1
    }

    try:
        response = await client.post(ELASTICSEARCH_URL, json=query)
        hits = response.json().get("hits", {}).get("hits", [])

        if hits:
            hit = hits[0]
            attacker_ip = hit["_source"].get("source", {}).get("ip")
            event_time = hit["_source"].get("@timestamp", "Desconocido")
            message_text = hit["_source"].get("message", "") # Leemos la "carta escrita a mano"

            if not attacker_ip and message_text:
                import re
                # Busca cualquier patrón que parezca una IP en el texto
                ips_found = re.findall(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', message_text)
                # Filtramos la IP de nuestro propio Ubuntu para no auto-bloquearnos
                for ip in ips_found:
                    if ip != "192.168.0.102" and ip != "127.0.0.1":
                        attacker_ip = ip
                        break

            # Solo si logramos obtener una IP, lanzamos el SOAR y Discord
            if attacker_ip:
                logger.warning(f"🚨 REGLA DETONADA: {rule['title']} | IP: {attacker_ip}")
                
                payload = {
                    "attacker_ip": attacker_ip,
                    "rule_name": rule['title'],
                    "mitre_tags": mitre_tags,
                    "severity": rule.get('level', 'high').upper(),
                    "timestamp": event_time
                }
                
                await client.post(SOAR_WEBHOOK_URL, json=payload)
                
    except Exception as e:
        logger.error(f"❌ Error consultando SIEM: {e}")

async def main():
    logger.info("👁️ Motor de Detección Avanzado Iniciado...")
    rules = load_rules()
    logger.info(f"📚 {len(rules)} reglas cargadas en memoria.")
    if len(rules) == 0: return

    async with httpx.AsyncClient() as client:
        while True:
            for rule in rules:
                await check_rule(client, rule)
            await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(main())