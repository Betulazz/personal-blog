FROM node:22.22.2-alpine AS dependencies
ARG NPM_REGISTRY=https://registry.npmjs.org
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --registry=$NPM_REGISTRY

FROM dependencies AS build
ENV NODE_OPTIONS=--max-old-space-size=1536
COPY . .
RUN npm run build

FROM node:22.22.2-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

