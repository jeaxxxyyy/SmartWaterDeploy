# Neon PostgreSQL deployment

SmartWater can use MySQL locally and Neon PostgreSQL for the Vercel deployment. Neon is PostgreSQL, so its database connection must use `pgsql`, port `5432`, and TLS.

## Private connection files

Copy `.env.neon.example` to `.env.neon` for migration commands. Retain the application's existing `APP_KEY` and use the **direct** connection string from Neon's Connect dialog for `DB_URL`.

Use `.env.vercel.neon` for Vercel environment variables, with the **pooled** connection string instead. Both private files are ignored by Git and excluded from deployment bundles. They contain credentials; never commit them or paste their contents into chat.

The application reads `DB_URL`. Variables named `DATABASE_URL` or `POSTGRES_URL` supplied by an integration must be copied to `DB_URL` unless the application configuration is changed to read them.

## Create the tables

The PHP CLI needs `pdo_pgsql`. On the supplied Laragon PHP installation the extension is available and can be enabled for one command without changing the local PHP configuration:

```powershell
php -d extension=pdo_pgsql artisan migrate --force --env=neon
php -d extension=pdo_pgsql artisan migrate:status --env=neon
```

Run migrations through a trusted local command, never a public web endpoint. These commands create application tables; they do not copy Laragon records. Do not run the development database seeder against the public deployment.

For a fresh installation, create the first administrator using its hidden password prompt:

```powershell
php -d extension=pdo_pgsql artisan user:create-admin YOUR_EMAIL --name="Water Administrator" --env=neon
```

If migrating existing records, take a local backup and plan a PostgreSQL data transfer separately. A MySQL SQL dump cannot be imported directly into PostgreSQL. Keep the same application key for existing encrypted data.

If the imported accounts use the development credentials documented in the README, replace those passwords before enabling public access to the database-backed application.

## Configure Vercel

In the **smart-water-deploy** project's Production environment variables, use the values in the private `.env.vercel.neon` file. The important database settings are:

If the project already has environment variables, update existing entries through their Edit controls. The Add/Import form creates entries and can reject a full file when names already exist. Add only names that are missing. If an import reports duplicates, check the saved list before retrying: some new entries may have been created even though other entries failed.

| Name | Value |
| --- | --- |
| `DB_CONNECTION` | `pgsql` |
| `DB_PORT` | `5432` |
| `DB_URL` | The full pooled Neon URL, including its TLS parameters |
| `DB_SSLMODE` | `require`, or a certificate-verified mode configured for your environment |
| `DB_CHARSET` | `utf8` |
| `PGOPTIONS` | `endpoint=YOUR_POOLED_ENDPOINT`, using the first segment of the pooled hostname, including `-pooler` |

`DB_URL` supplies the host, port, database, username, and password. Check that an old MySQL connection string is not overriding it. Keep `APP_NAME="Smart Water Monitoring"`, `APP_ENV=production`, `APP_DEBUG=false`, and `APP_URL=https://smartwater-monitoring-system.vercel.app` for the current deployment. The Vercel project is still named `smart-water-deploy`. Use separate database credentials and a separate database branch for Preview deployments.

The deployed PHP runtime's PostgreSQL client requires the explicit routing hint in `PGOPTIONS`. Without it, Neon reports “Endpoint ID is not specified” when TLS SNI is unavailable. Set this variable in Vercel before deploying so libpq receives it at process startup. For example, host `ep-example-pooler.c-6.us-east-2.aws.neon.tech` uses `PGOPTIONS=endpoint=ep-example-pooler`. Keep TLS enabled. Appending an arbitrary `options` parameter to `DB_URL` alone does not work with the current Laravel connector, which builds its own PDO DSN.

The `pgsql` configuration also uses `PDO::PGSQL_ATTR_DISABLE_PREPARES` to execute native bound parameters without named server-side prepared statements. Older libpq clients can otherwise abort transactions when PDO deallocates statements through PgBouncer, including the database-cache increments used by login rate limiting. Keep the database cache and login throttling enabled.

Keep sessions and cache in the database and use `QUEUE_CONNECTION=sync`. Redeploy after saving the variables, then check `/up`, `/api/ping`, the login page, consumption monitoring, analytics, and a PDF export. Health endpoints alone do not verify the database-backed pages.

## Remaining services

Set up a verified SMTP provider before using password recovery or verification emails. Configure an external scheduler to invoke `/api/internal/schedule` every minute with `Authorization: Bearer YOUR_CRON_SECRET`, as described in `OPERATIONS.md`. Uploads require persistent object storage because Vercel's local filesystem is temporary.

References: [Neon with Laravel](https://neon.com/docs/guides/laravel), [Neon connection pooling](https://neon.com/docs/connect/connection-pooling), [Neon connection errors](https://neon.com/docs/connect/connection-errors#the-endpoint-id-is-not-specified), [PostgreSQL environment variables](https://www.postgresql.org/docs/current/libpq-envars.html), [Laravel PostgreSQL connections](https://laravel.com/docs/13.x/database).
