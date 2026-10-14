FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock && python -m spacy download en_core_web_sm
RUN useradd --uid 10001 --create-home appuser
RUN mkdir /data && chown appuser:appuser /data
COPY clearspace ./clearspace
USER appuser
EXPOSE 8000
CMD ["uvicorn", "clearspace.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--proxy-headers"]
