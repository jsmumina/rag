FROM python:3.11-slim

# Hugging Face Spaces runs the container as UID 1000, so build under that user
# or writes to the working directory (embedded Qdrant, temp files) will fail.
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    QDRANT_PATH=/home/user/app/qdrant_db

WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY --chown=user app ./app

# Listen on the port the host provides ($PORT on Render), falling back to 7860
# (Hugging Face Spaces' expected port) when it isn't set.
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
