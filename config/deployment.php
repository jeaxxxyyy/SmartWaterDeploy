<?php

return [
    'vercel' => env('VERCEL') === '1',
    'cron_secret' => env('CRON_SECRET'),
];
