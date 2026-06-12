# Usamos una imagen oficial y ligera de Python
FROM python:3.12-slim

# Configuramos el directorio de trabajo
WORKDIR /app

# Copiamos los requerimientos y los instalamos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos todo el código fuente y el archivo .env
COPY . .

# Exponemos el puerto de la API
EXPOSE 8000

# Comando de arranque para producción (sin --reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]