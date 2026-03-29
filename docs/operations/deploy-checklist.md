# Checklist de Deploy

1. Configurar `DATABASE_URL`, `REDIS_URL`, `SENTRY_DSN` e envs de storage.
2. Validar `AUTH_COOKIE_SECURE=true` em producao.
3. Confirmar `AUTH_COOKIE_SAME_SITE` coerente com o dominio do frontend.
4. Rodar `npm --prefix backend run migrate`.
5. Rodar `npm --prefix backend run seed:admin` se o ambiente for novo.
6. Validar `/health` e `/ready` apos o deploy.
7. Executar `npm --prefix backend run test` antes do corte final.
8. Confirmar versionamento do bucket de receitas.
9. Confirmar agendamento do backup diario do Postgres.
10. Validar logs estruturados e monitoramento de erro no ambiente.
