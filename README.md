# Smart Water Monitoring

Smart Water Monitoring is a Laravel application for household water telemetry, estimated billing, alerts, reports, and municipal device lifecycle management. ESP32-S3/M5Stack CoreS3 meters send readings to the Laravel API and the dashboard refreshes live data every three seconds.

## Requirements

- PHP 8.3+ with the PDO driver for SQLite, MySQL, or PostgreSQL
- Composer
- Node.js and npm
- Arduino IDE 2.x for the physical meter panel

## Quick start

```bash
composer install
npm install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run build
composer demo
```

Open the configured LAN URL after starting Laravel and Vite. Telemetry must come from the commissioned physical sensor panel.

Demo accounts:

- Household: `test@example.com` / `password`
- Administrator: `admin@gmail.com` / `admin123`
- Demo panel identity: managed internally; it has no interactive login

Demo credentials are created only by the development seeder. Existing passwords are never reset when the seeder is rerun. Change all development credentials before deployment.

## Project map

| Directory | Responsibility |
| --- | --- |
| `app/Http/Controllers/Api` | JSON API controllers grouped by feature |
| `app/Models` | Eloquent models and relationships |
| `app/Services` | Billing, consumption, and audit business logic |
| `arduino/smartwater` | ESP32-S3/M5Stack firmware |
| `config` | Application and Smart Water configuration |
| `database` | Migrations, factories, and seed data |
| `resources/views` | Blade layout, page, and report templates |
| `resources/css` and `resources/js` | Vite-managed frontend assets |
| `routes` | Web, API, and console route definitions |
| `tests` | Feature and unit coverage |

## Municipal device registry

The municipal administrator registers and assigns every meter in **Admin → Device Management**. Each device record tracks the municipal asset number, manufacturer serial, household, installation date, hardware ID, firmware version, connectivity, maintenance state, and lifecycle status.

Registration displays a device UUID and one-time activation code. The code expires after 30 minutes and is stored only as a password hash. During commissioning, the ESP32 exchanges that code and its hardware ID for a scoped Laravel Sanctum credential. Credentials are revoked when an administrator rotates, suspends, or decommissions a meter.

## Commission an ESP32-S3 / M5Stack CoreS3 meter

Firmware lives in `arduino/smartwater`. It reads flow-sensor pulses and uploads an interval reading every three seconds. Configure the sensor GPIO and calibration value in the ignored `secrets.h` file before compiling.

1. Register the meter in **Admin → Device Management** and copy the one-time UUID and activation code.
2. Copy `arduino/smartwater/secrets.example.h` to the ignored `secrets.h` file.
3. Enter only the Wi-Fi details, LAN server URL, UUID, and activation code.
4. Install the ESP32 board package and `M5Unified`, select **M5Stack CoreS3** and the USB/JTAG COM port, then upload `smartwater.ino`.
5. Confirm that the registry shows the expected hardware ID, firmware version, and recent **Last seen** time.

The firmware keeps each unsent interval in ESP32 Preferences and sends a stable `reading_id` derived from the registered device UUID and local sequence. Laravel counts `liters_used` only once per registered device and reading ID; the client-reported cumulative total is retained for diagnostics and does not replace the server total.

Remove the activation code from `secrets.h` after successful commissioning and upload once more before field installation. Use **New activation code** for an authorized replacement or recommissioning; it immediately revokes the previous credential.

For LAN testing, set `SMARTWATER_SERVER_URL` to the computer's reachable LAN IPv4 address, never `localhost` or `127.0.0.1`. Allow port 8000 through the PC firewall and bind Laravel to the network interface:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

## Verification

For Vercel import settings, environment variables, database setup, and the protected scheduler, see the [Vercel deployment instructions](docs/OPERATIONS.md#vercel-deployment).

For Neon PostgreSQL connection files, migrations, and Vercel configuration, see the [Neon deployment guide](docs/NEON.md).

```bash
php artisan test
npm run test:frontend
npm run build
```

Configuration defaults are documented in `.env.example`, `config/devices.php`, and `config/municipality.php`. Browser tokens expire after `SANCTUM_WEB_TOKEN_MINUTES` (eight hours by default); commissioned device credentials keep their separate lifecycle.

Both `composer dev` and `composer demo` start the Laravel scheduler so scheduled notifications are delivered. When running the web server separately, also run `php artisan schedule:work`. Production hosting must run `php artisan schedule:run` every minute through its scheduler and serve the built assets from the `public` directory.

The default `MAIL_MAILER=log` writes password-reset and verification messages to local logs; it does not deliver email. Configure and verify a real mail transport before relying on email recovery. For production, set `APP_ENV=production`, `APP_DEBUG=false`, configure the public HTTPS `APP_URL`, replace development credentials, and verify database backups and a physical meter upload. The application currently retains raw telemetry indefinitely; automatic monthly summarization and deletion are not implemented.

## Analytics, audit, and privacy controls

Administrator analytics are available at `GET /api/analytics/admin`; household analytics are available at `GET /api/analytics/household`. Both endpoints accept `last_7_days`, `last_30_days`, `last_3_months`, `last_12_months`, or a validated `custom` range using `from` and `to`. Results include the configured `APP_TIMEZONE` and omit metrics when no valid readings exist.

Administrative and security actions are stored in `audit_logs` and written to the rotating `audit` log channel. Credentials, passwords, activation codes, and access tokens are redacted from audit metadata. Household analytics, billing settings, statements, notifications, readings, and device information are scoped to the authenticated household.

## Resident website services

The household workspace includes finalized statement and receipt downloads, monthly usage goals with end-of-month forecasting, configurable in-app notification categories and quiet hours, English/Filipino navigation labels, a low-bandwidth mode, and a tracked municipal service-request center. The administrator workspace includes an action center, a request assignment/response workflow, and an offline-payment ledger that generates official PDF receipts.

The website does not accept or process online payments. Authorized municipal staff record cash, check, bank-deposit, or other offline payments, and every entry is retained in the payment ledger and audit log.

The site exposes `/manifest.webmanifest` and a service worker for installation and resilient app-shell loading. API responses are never stored by the service worker; authenticated dashboard snapshots remain user-scoped in session storage and live meter information always requires a current network response.
