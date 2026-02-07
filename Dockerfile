FROM python:3.13-alpine AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

FROM base AS builder

RUN apk add --no-cache gcc musl-dev bash

RUN python -m venv /venv

COPY . .

RUN uv sync --locked

RUN scripts/update_protos.sh

RUN uv build && /venv/bin/pip install dist/*.whl


FROM node:23-alpine AS frontend_builder

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY frontend .

RUN pnpm build

FROM base AS app

RUN apk add --no-cache nginx supervisor

ENV LOGURU_LEVEL=INFO

COPY --from=builder /venv /venv
COPY --from=frontend_builder /app/dist /app/dist
COPY conf/nginx.conf /etc/nginx/http.d/default.conf
COPY conf/supervisord.conf /app/supervisord.conf

CMD ["supervisord", "-c", "/app/supervisord.conf"]
