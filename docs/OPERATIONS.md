# Smart Water Operations Guide

This guide covers the minimum operational controls required beyond a local capstone demonstration.

## Production deployment

1. Copy `.env.production.example` to the server as `.env` and replace every `CHANGE_TO_...` value.
2. Use an HTTPS domain and keep `APP_DEBUG=false`.
3. Create a dedicated database account with access only to the Smart Water database. Do not use the MySQL root account.
4. Run `composer install --no-dev --optimize-autoloader`, `npm ci`, and `npm run build`.
5. Run `php artisan migrate --force`, `php artisan config:cache`, `php artisan route:cache`, and `php artisan view:cache`.
6. Run a persistent queue worker for the database queue and restart it after deployments.
7. Run `php artisan schedule:run` every minute using Windows Task Scheduler or the production server scheduler.
8. Confirm `/up` responds successfully and verify the administrator System Health page.

The Laravel development server is suitable for LAN demonstrations only. Use IIS, Apache, or Nginx with HTTPS for actual deployment.

## Vercel deployment

The repository includes a single PHP function using `vercel-php@0.9.0` (PHP 8.5), with Node.js 22 for asset builds. Vercel supplies the PHP runtime; do not enter `php artisan serve` or `composer dev` as a build command.

### Import settings

Import the repository with these settings. `vercel.json` already defines the install command, build command, and output directory, so leave the corresponding dashboard overrides disabled.

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `./`, containing `composer.json` |
| Node.js Version | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run build:vercel` |
| Output Directory | `dist` |

The build compiles Vite assets into `public/build` for Laravel's manifest lookup and copies public assets into `dist` for the CDN. PHP source, dotfiles, and local storage are excluded from static publication. All application routes, including `/api/*`, execute through `api/index.php`. The PHP builder installs production Composer dependencies and checks their platform requirements. Builds do not migrate or seed databases.

### Database and environment variables

1. Create an online MySQL database. A Laragon database on `localhost`, `127.0.0.1`, or a private LAN address cannot be reached by Vercel. Use the provider's host, port, database name, credentials, and TLS requirements. Keep the database and Vercel function in nearby regions where possible.
2. Import the values from `.env.vercel.example` into Vercel's **Environment Variables**, scoped to **Production**, and replace every placeholder. Required values include `APP_KEY`, `APP_URL`, all `DB_*` connection details, and `CRON_SECRET`. Set `APP_URL` to the stable public HTTPS domain, without a trailing slash. Configure real SMTP credentials for password recovery and verification emails.
3. For an existing database, retain its existing `APP_KEY`. For a new installation, generate one using `php artisan key:generate --show`. Generate a separate scheduler secret using `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`. Copy these values privately into Vercel; do not commit actual credentials.
4. Use separate databases and environment variables for Preview deployments. Preview builds must not use the production database. Redeploy after changing environment variables.

`SESSION_DRIVER=database` and `CACHE_STORE=database` preserve sessions, rate limits, and scheduler locks across function instances. `QUEUE_CONNECTION=sync` runs queued work during the request because this deployment does not run a persistent Laravel queue worker. Laravel caches, compiled views, and PDF font files use temporary storage. Application and audit messages go to Vercel logs; audit records also remain in MySQL. Local files in `/tmp` are disposable and must not be used for persistent uploads or backups.

If your database provider requires a CA certificate, supply its public certificate with the deployment and configure `MYSQL_ATTR_SSL_CA` to its file path. This certificate is separate from database credentials. Preserve certificate verification according to the provider's instructions.

### Initialize the online database

Run database commands from your computer or a trusted deployment runner, not through a public HTTP endpoint. Create a private `.env.vercel` file using `.env.vercel.example`, fill it with the online connection settings and the same application key used in Vercel, then run:

```powershell
php artisan migrate --force --env=vercel
```

For existing data, import the Laragon database into the online database first, then run pending migrations. For an empty installation, create the first administrator with a hidden password prompt:

```powershell
php artisan user:create-admin owner@example.com --name="Water Administrator" --env=vercel
```

Configure municipal rates and register household accounts and meters through that administrator. Do not run the demonstration seeder on a public deployment: it creates documented demo credentials and sample device records. `.env.vercel` is ignored by Git and excluded from deployment uploads. If MySQL is restricted to certain networks, allow the trusted machine used for these commands as well as the deployment's connections.

### Run scheduled maintenance

Configure an external scheduler to call the production URL **every minute**:

```text
GET https://YOUR-PROJECT.vercel.app/api/internal/schedule
Authorization: Bearer YOUR_CRON_SECRET
```

POST is also supported. Send the secret as a header, never in a query string. The endpoint rejects missing or incorrect secrets, locks against overlapping runs using the shared cache, and runs due Laravel tasks before returning. Scheduled notifications run every minute; expired reset links and access tokens are cleaned up daily. Failed tasks return HTTP 500; overlapping invocations return HTTP 409 and `Retry-After`. Monitor errors in Vercel logs and configure retries in the scheduler.

The default `vercel.json` has no built-in cron schedule so it can deploy on Hobby. Vercel Hobby cron jobs can run only once per day, which does not meet the application's minute-based notification requirement. On a plan supporting minute-based cron, you may instead add this property to `vercel.json`:

```json
"crons": [{ "path": "/api/internal/schedule", "schedule": "* * * * *" }]
```

Vercel sends `CRON_SECRET` in the authorization header automatically. Disable the external scheduler if using Vercel cron. The scheduled endpoint must be reachable by the scheduler; account for Vercel Deployment Protection when configuring access.

### Verify the deployment

Check `/up`, `/api/ping`, login, the administrator System Health page, and a billing PDF download. Confirm a scheduled advisory is delivered after its scheduled time. Ensure the production domain is reachable by both the scheduler and the physical meter without an interactive Vercel authentication screen.

Update the meter's local `SMARTWATER_SERVER_URL` to the stable HTTPS production URL and verify its TLS connection and a fresh reading on hardware. Existing meter credentials keep working only if the corresponding device records and tokens were migrated; otherwise commission the device again. Do not commit `secrets.h`.

Local validation commands:

```powershell
php artisan test --compact
npm run test:frontend
npm run build:vercel
```

References: [PHP runtime](https://github.com/vercel-community/php), [Vercel build settings](https://vercel.com/docs/builds/configure-a-build), [cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Laravel deployment](https://laravel.com/docs/13.x/deployment).

## Backup and restore

Create a database backup before migrations, billing-policy changes, or data repair. Store backups outside the public web directory and copy them to a second protected location.

Example backup with Laragon MySQL:

```powershell
mysqldump --host=127.0.0.1 --port=3306 --user=smartwater_app --single-transaction --routines --triggers --result-file=smartwater-backup.sql smartwater
```

Test restoration in a separate database, never over the active database:

```powershell
mysql --host=127.0.0.1 --port=3306 --user=smartwater_app smartwater_restore
```

After restoration, confirm user counts, the active billing configuration, the latest reading ID, statements, payments, and audit logs.

## Queue and scheduler checks

- Start the queue worker with `php artisan queue:work --tries=3 --timeout=60`.
- Check failed jobs with `php artisan queue:failed`.
- Run scheduled notification delivery manually with `php artisan notifications:deliver-scheduled` when diagnosing delays.
- Prune expired login tokens using the configured scheduler.

## Device credential handling

- `arduino/SmartWater_Modular/secrets.h` must remain local and untracked.
- Copy `secrets.example.h` when provisioning a new development device.
- Rotate a Wi-Fi password, activation code, or device token if it is exposed.
- Decommission a lost device from the administrator dashboard to revoke its credentials.

## Recovery checks

After a server, database, or power restart:

1. Confirm the database, web server, queue worker, and scheduler are running.
2. Open `/up` and the administrator System Health page.
3. Confirm the latest meter transitions online after its next telemetry submission.
4. Confirm a retried `reading_id` returns `duplicate: true` and does not increase consumption twice.
5. Generate a test statement in a non-production household account and verify the PDF.

## Historical threshold repair

Use a dry run first:

```powershell
php artisan water:repair-threshold-history
```

After confirming a backup exists, apply the repair:

```powershell
php artisan water:repair-threshold-history --apply
```

The command recalculates monthly threshold flags, archives only invalid threshold notifications, preserves leak and announcement records, and writes an audit log.
