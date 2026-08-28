# FastAPI Lyria 3 generation service. Reads config from environment
# variables (Coolify injects them); the missing ../.env is ignored.
FROM python:3.12-slim

WORKDIR /app

# Install deps first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# main.py runs uvicorn on 0.0.0.0:8000; GET / is a health check.
CMD ["python", "main.py"]
