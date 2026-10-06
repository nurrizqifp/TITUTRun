# check=skip=InvalidDefaultArgInFrom
ARG NODE_IMAGE
ARG NGINX_IMAGE
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM ${NGINX_IMAGE}
ARG FRONTEND_CONTAINER_PORT
ENV FRONTEND_CONTAINER_PORT=$FRONTEND_CONTAINER_PORT
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE ${FRONTEND_CONTAINER_PORT}
