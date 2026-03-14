# Stage 1: Build Angular app
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- UnitedService

# Stage 2: Serve with Nginx
FROM nginx:1.25
COPY --from=build /app/dist/UnitedService /usr/share/nginx/html

# Copy custom service worker
COPY --from=build /app/src/custom-sw.js /usr/share/nginx/html/custom-sw.js

# Copy custom nginx config for Angular routes
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
