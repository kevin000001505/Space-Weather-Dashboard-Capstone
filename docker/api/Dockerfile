FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY docker/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Set Python path to include /app for shared module imports
ENV PYTHONPATH=/app
# Don't generate byte code to prevent permission errors
ENV PYTHONDONTWRITEBYTECODE=1

# Run FastAPI application (will be overridden if command is specified in docker-compose)
# The worker counts is based on ((CPU*2)+1)
CMD ["gunicorn", "main:app", \
    "--bind", "0.0.0.0:8000", \
    "--workers", "15", \
    "--worker-class", "uvicorn.workers.UvicornWorker", \
    "--reload"]

# Develop usage
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]