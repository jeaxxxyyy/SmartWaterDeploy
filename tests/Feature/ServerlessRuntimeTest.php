<?php

namespace Tests\Feature;

use Symfony\Component\Process\Process;
use Tests\TestCase;

class ServerlessRuntimeTest extends TestCase
{
    public function test_dynamic_responses_disable_shared_caching_on_vercel(): void
    {
        config(['deployment.vercel' => true]);

        $this->getJson('/api/ping')->assertOk()
            ->assertHeader('Vercel-CDN-Cache-Control', 'no-store');
    }

    public function test_the_function_preserves_api_paths_and_json_responses(): void
    {
        $result = $this->runFunction('/api/ping');

        $this->assertSame(200, $result['status']);
        $this->assertSame('ok', json_decode($result['body'], true)['status']);
        $this->assertRuntimePaths($result);
    }

    public function test_blade_https_urls_and_pdf_generation_work_with_temporary_storage(): void
    {
        $result = $this->runFunction('/login');

        $this->assertSame(200, $result['status']);
        $this->assertStringContainsString('https://water.example/build/', $result['body']);
        $this->assertTrue($result['pdf']);
        $this->assertTrue($result['secure_request']);
        $this->assertRuntimePaths($result);
    }

    private function assertRuntimePaths(array $result): void
    {
        $this->assertStringStartsWith(sys_get_temp_dir(), $result['storage']);
        $this->assertStringStartsWith($result['storage'], $result['view_cache']);
        $this->assertStringStartsWith($result['storage'], $result['package_cache']);
        $this->assertStringStartsWith($result['storage'], $result['font_cache']);
        $this->assertSame('stderr', $result['log_channel']);
    }

    private function runFunction(string $uri): array
    {
        $script = <<<'PHP'
$_SERVER['REQUEST_URI'] = getenv('TEST_REQUEST_URI');
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['SERVER_NAME'] = $_SERVER['HTTP_HOST'] = 'water.example';
$_SERVER['SERVER_PORT'] = '80';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';
$_SERVER['HTTP_X_FORWARDED_PORT'] = '443';
ob_start();
require 'api/index.php';
$body = ob_get_clean();
$pdf = app('dompdf.wrapper')->loadHTML('<html><body style="font-family: DejaVu Sans">Water statement: 12 m³</body></html>')->output();
echo json_encode([
    'status' => http_response_code(),
    'body' => $body,
    'pdf' => str_starts_with($pdf, '%PDF-'),
    'secure_request' => app('request')->isSecure(),
    'storage' => storage_path(),
    'view_cache' => config('view.compiled'),
    'package_cache' => app()->getCachedPackagesPath(),
    'font_cache' => config('dompdf.options.font_cache'),
    'log_channel' => config('logging.default'),
], JSON_THROW_ON_ERROR);
PHP;

        $process = new Process([PHP_BINARY, '-r', $script], base_path(), [
            'VERCEL' => '1',
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_KEY' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
            'APP_URL' => 'https://water.example',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'DB_URL' => '',
            'SESSION_DRIVER' => 'array',
            'CACHE_STORE' => 'array',
            'LOG_CHANNEL' => 'stderr',
            'MAIL_MAILER' => 'array',
            'TEST_REQUEST_URI' => $uri,
        ]);
        $process->mustRun();

        return json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
    }
}
