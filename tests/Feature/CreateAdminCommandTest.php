<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_an_active_verified_administrator_with_a_hashed_password(): void
    {
        $this->artisan('user:create-admin', ['email' => 'OWNER@example.com', '--name' => 'Water Administrator'])
            ->expectsQuestion('Administrator password (at least 12 characters)', 'a-strong-test-password')
            ->expectsQuestion('Confirm password', 'a-strong-test-password')
            ->assertSuccessful();

        $admin = User::where('email', 'owner@example.com')->firstOrFail();
        $this->assertTrue($admin->isAdmin());
        $this->assertTrue($admin->isAccountActive());
        $this->assertTrue($admin->hasVerifiedEmail());
        $this->assertTrue(Hash::check('a-strong-test-password', $admin->password));
        $this->assertSame('Water Administrator', $admin->name);
    }

    public function test_existing_accounts_are_never_overwritten_or_promoted(): void
    {
        $user = User::factory()->create(['email' => 'existing@example.com', 'role' => 'user']);

        $this->artisan('user:create-admin', ['email' => $user->email])->assertFailed();
        $this->assertSame('user', $user->fresh()->role);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_short_or_mismatched_passwords_do_not_create_an_account(): void
    {
        $this->artisan('user:create-admin', ['email' => 'owner@example.com'])
            ->expectsQuestion('Administrator password (at least 12 characters)', 'short')
            ->assertFailed();

        $this->artisan('user:create-admin', ['email' => 'owner@example.com'])
            ->expectsQuestion('Administrator password (at least 12 characters)', 'a-strong-test-password')
            ->expectsQuestion('Confirm password', 'a-different-test-password')
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }
}
