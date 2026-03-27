FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --chown=nextjs:nodejs package*.json ./
RUN npm install --legacy-peer-deps
COPY --chown=nextjs:nodejs . .
RUN npm run build
USER nextjs
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
