# ETAPA 1: Construcción (Node.js)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Compilamos el código React a archivos estáticos (HTML/CSS/JS puros)
RUN npm run build

# ETAPA 2: Producción (Nginx)
FROM nginx:alpine
# Copiamos el código compilado de la etapa 1 al servidor web Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]