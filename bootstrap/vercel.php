<?php

$storagePath = sys_get_temp_dir().'/smartwater-'.substr(hash('sha256', __DIR__), 0, 12);

foreach (['app/private', 'app/public', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs', 'fonts', 'bootstrap/cache'] as $directory) {
    $path = $storagePath.'/'.$directory;

    if (! is_dir($path) && ! @mkdir($path, 0700, true) && ! is_dir($path)) {
        throw new RuntimeException('Cannot create the serverless storage directory.');
    }
}

$runtimePaths = [
    'LARAVEL_STORAGE_PATH' => $storagePath,
    'VIEW_COMPILED_PATH' => $storagePath.'/framework/views',
    'APP_CONFIG_CACHE' => $storagePath.'/bootstrap/cache/config.php',
    'APP_EVENTS_CACHE' => $storagePath.'/bootstrap/cache/events.php',
    'APP_PACKAGES_CACHE' => $storagePath.'/bootstrap/cache/packages.php',
    'APP_ROUTES_CACHE' => $storagePath.'/bootstrap/cache/routes.php',
    'APP_SERVICES_CACHE' => $storagePath.'/bootstrap/cache/services.php',
];

$defaults = [
    'APP_ENV' => 'production',
    'APP_DEBUG' => 'false',
    'APP_TIMEZONE' => 'Asia/Manila',
    'LOG_CHANNEL' => 'stderr',
    'SESSION_DRIVER' => 'database',
    'SESSION_SECURE_COOKIE' => 'true',
    'CACHE_STORE' => 'database',
    'QUEUE_CONNECTION' => 'sync',
];

$deploymentHost = getenv('VERCEL_ENV') === 'production'
    ? (getenv('VERCEL_PROJECT_PRODUCTION_URL') ?: getenv('VERCEL_URL'))
    : getenv('VERCEL_URL');

if ($deploymentHost) {
    $defaults['APP_URL'] = 'https://'.$deploymentHost;
}

foreach ($defaults as $name => $value) {
    if (getenv($name) === false && ! isset($_ENV[$name]) && ! isset($_SERVER[$name])) {
        $runtimePaths[$name] = $value;
    }
}

foreach ($runtimePaths as $name => $value) {
    putenv($name.'='.$value);
    $_ENV[$name] = $_SERVER[$name] = $value;
}
