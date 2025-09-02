FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
# Explicitly copy index.html and src to ensure they're present in the image
COPY index.html ./
COPY src ./src
# Copy remaining files
COPY . .
EXPOSE 5173
# Bind Vite to 0.0.0.0 so it's reachable from the host when running in Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
