FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npm start"]
