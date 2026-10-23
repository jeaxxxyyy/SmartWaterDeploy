<?php

putenv('VERCEL=1');
$_ENV['VERCEL'] = $_SERVER['VERCEL'] = '1';

// Preserve /api routes when PHP runs behind the single function entry point.
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = __DIR__.'/../public/index.php';

require __DIR__.'/../public/index.php';
