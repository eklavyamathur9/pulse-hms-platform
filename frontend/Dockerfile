# ---- Builder Stage ----
FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime Stage ----
FROM nginx:alpine

RUN adduser -D -H -u 1000 -s /bin/sh nginx

COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
