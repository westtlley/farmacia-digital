# Backup e Recovery

## Banco PostgreSQL

- Ferramenta recomendada: `pg_dump` em formato custom (`-Fc`).
- Periodicidade minima recomendada: diario, com retencao de 14 a 30 dias.
- Periodicidade recomendada para operacao critica: snapshot diario + dump adicional antes de migrations.
- Script local de apoio: [backup-postgres.ps1](C:/Users/Wesley%20Figueiredo/Downloads/Farmacia%20Digital/farmacia-digital/backend/scripts/backup-postgres.ps1).
- Script de restore: [restore-postgres.ps1](C:/Users/Wesley%20Figueiredo/Downloads/Farmacia%20Digital/farmacia-digital/backend/scripts/restore-postgres.ps1).

## Storage de receitas

- Bucket S3 deve permanecer com versionamento habilitado.
- Recomenda-se lifecycle para manter versoes antigas por no minimo 30 dias.
- O banco guarda apenas `storage_provider` e `file_key`; o restore completo exige banco + bucket.

## Procedimento de restore

1. Isolar a aplicacao em maintenance mode.
2. Restaurar o dump do Postgres com `pg_restore`.
3. Confirmar que o bucket/S3 contem os objetos referenciados em `prescriptions.file_key`.
4. Subir a aplicacao e validar `/ready`.
5. Executar smoke test de login, pedido e abertura de receita.

## Onde armazenar os backups

- Banco: bucket privado dedicado, separado do bucket operacional da aplicacao.
- Arquivos: versionamento nativo do bucket de storage.
- Nunca armazenar dumps em disco local como estrategia principal de producao.
