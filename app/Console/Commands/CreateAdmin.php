<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CreateAdmin extends Command
{
    protected $signature = 'user:create-admin {email} {--name=Administrator}';

    protected $description = 'Create an administrator using a hidden password prompt';

    public function handle(): int
    {
        $data = ['email' => strtolower(trim($this->argument('email'))), 'name' => $this->option('name')];
        $validator = Validator::make($data, [
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'name' => ['required', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        $password = $this->secret('Administrator password (at least 12 characters)');

        if (! is_string($password) || strlen($password) < 12) {
            $this->error('The password must contain at least 12 characters.');

            return self::FAILURE;
        }

        if ($this->secret('Confirm password') !== $password) {
            $this->error('The passwords do not match.');

            return self::FAILURE;
        }

        $user = new User([
            ...$data,
            'password' => $password,
            'role' => 'admin',
            'account_number' => 'ACC-ADMIN-'.Str::upper(Str::random(12)),
            'is_active' => true,
            'created_by_admin' => true,
            'account_status' => User::ACCOUNT_STATUS_ACTIVE,
            'approved_at' => now(),
        ]);
        $user->email_verified_at = now();
        $user->save();

        $this->info('Administrator created.');

        return self::SUCCESS;
    }
}
