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

RUN apk add --no-cache protobuf protobuf-dev tree

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml /app/frontend/
RUN cd /app/frontend && npm install -g pnpm && pnpm install

COPY frontend /app/frontend
COPY proto /app/proto


RUN cd /app/frontend && pnpm proto-generate && pnpm build

FROM base AS app

RUN apk add --no-cache supervisor nodejs pnpm

ENV LOGURU_LEVEL=INFO

COPY --from=builder /venv /venv
COPY --from=frontend_builder /app/frontend/public /app/frontend/public
COPY --from=frontend_builder /app/frontend/.next/standalone /app/frontend
COPY --from=frontend_builder /app/frontend/.next/static /app/frontend/.next/static

COPY conf/supervisord.conf /app/supervisord.conf

CMD ["supervisord", "-c", "/app/supervisord.conf"]
