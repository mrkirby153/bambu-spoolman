FROM python:3.13-alpine AS base

WORKDIR /app

FROM base AS builder

RUN apk add --no-cache gcc musl-dev

RUN pip install poetry
RUN python -m venv /venv

COPY pyproject.toml poetry.lock ./

RUN poetry export -f requirements.txt --without dev > requirements.txt | /venv/bin/pip install -r /dev/stdin

COPY . .
RUN poetry build && /venv/bin/pip install dist/*.whl


FROM node:23-alpine AS frontend_builder

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY frontend .

RUN pnpm build

FROM base AS app

RUN apk add --no-cache nginx supervisor

COPY --from=builder /venv /venv
COPY --from=frontend_builder /app/dist /app/dist
COPY conf/nginx.conf /etc/nginx/http.d/default.conf
COPY conf/supervisord.conf /app/supervisord.conf

CMD ["supervisord", "-c", "/app/supervisord.conf"]
