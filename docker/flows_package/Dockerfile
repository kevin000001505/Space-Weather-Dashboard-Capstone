# Dockerfile
FROM prefecthq/prefect:3-latest

COPY docker/flows_package/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

WORKDIR /opt/prefect-app

# Don't generate byte code to prevent permission errors
ENV PYTHONDONTWRITEBYTECODE=1

COPY prefect/ .