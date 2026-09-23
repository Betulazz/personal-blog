FROM python:3.12-slim AS build
ARG PIP_INDEX_URL=https://pypi.org/simple
WORKDIR /build
COPY pyproject.toml README.md ./
COPY app ./app
RUN python -m pip install --no-cache-dir --prefix=/install --index-url=$PIP_INDEX_URL .

FROM python:3.12-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY --from=build /install /usr/local
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
RUN addgroup --system blog && adduser --system --ingroup blog blog \
    && mkdir -p /app/uploads && chown blog:blog /app/uploads
USER blog
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]

