<?php

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('user:make-admin {email : Email address of the existing user}', function (string $email) {
    $user = User::where('email', $email)->first();

    if ($user === null) {
        $this->error("No user found with email {$email}.");

        return Command::FAILURE;
    }

    if ($user->isDevice()) {
        $this->error('Device accounts cannot be promoted to admin.');

        return Command::FAILURE;
    }

    if (! $user->created_by_admin) {
        $this->error('Only admin-created accounts can be promoted.');

        return Command::FAILURE;
    }

    if ($user->isAdmin()) {
        $this->info("{$user->email} is already an admin.");

        return Command::SUCCESS;
    }

    $user->forceFill([
        'role' => 'admin',
        'is_active' => true,
    ])->save();

    $this->info("{$user->email} is now an admin.");

    return Command::SUCCESS;
})->purpose('Promote an existing household user to admin from the server console');

$scheduleCommand = static function (string $command, array $arguments = []) {
    // Run in process so maintenance completes before a serverless request ends.
    return Schedule::call(fn () => Artisan::call($command, $arguments) === Command::SUCCESS)->name($command);
};

$scheduleCommand('auth:clear-resets')->daily();
$scheduleCommand('sanctum:prune-expired', ['--hours' => 24])->daily();
$scheduleCommand('notifications:deliver-scheduled')->everyMinute();
