# check=skip=InvalidDefaultArgInFrom
ARG NODE_IMAGE
FROM ${NODE_IMAGE}
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.js ./
COPY src ./src
ARG PORT
EXPOSE ${PORT}
CMD ["npm", "start"]
