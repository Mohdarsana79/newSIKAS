<?php

namespace Tests\Unit;

use App\Http\Middleware\CheckNpsnLicense;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class CheckNpsnLicenseTest extends TestCase
{
    protected CheckNpsnLicense $middleware;

    protected function setUp(): void
    {
        parent::setUp();
        $this->middleware = new CheckNpsnLicense;
        Config::set('license.enabled', true);
        Config::set('license.allowed_npsn', ['40202255', '60726693', '40202161']);
    }

    protected function createRequest(string $uri = '/dashboard'): Request
    {
        $request = Request::create($uri, 'GET');
        $request->attributes->set('test_license_middleware', true);

        return $request;
    }

    public function test_blocks_request_when_env_npsn_is_empty(): void
    {
        Config::set('license.npsn_code', '');

        $response = $this->middleware->handle($this->createRequest(), function () {
            return new Response('OK');
        });

        $this->assertTrue($response->isRedirection());
        $this->assertEquals(route('license.invalid'), $response->headers->get('Location'));
    }

    public function test_blocks_request_when_env_npsn_not_in_whitelist(): void
    {
        Config::set('license.npsn_code', '99999999');

        $response = $this->middleware->handle($this->createRequest(), function () {
            return new Response('OK');
        });

        $this->assertTrue($response->isRedirection());
        $this->assertEquals(route('license.invalid'), $response->headers->get('Location'));
    }

    public function test_allows_request_when_env_npsn_is_in_whitelist(): void
    {
        Config::set('license.npsn_code', '40202255');

        $response = $this->middleware->handle($this->createRequest(), function () {
            return new Response('OK');
        });

        $this->assertFalse($response->isRedirection());
        $this->assertEquals('OK', $response->getContent());
    }

    public function test_allows_request_when_license_gate_disabled_for_vps_mode(): void
    {
        Config::set('license.enabled', false);
        Config::set('license.npsn_code', '');

        $response = $this->middleware->handle($this->createRequest(), function () {
            return new Response('OK');
        });

        $this->assertFalse($response->isRedirection());
        $this->assertEquals('OK', $response->getContent());
    }

    public function test_allows_exception_routes_without_validation(): void
    {
        Config::set('license.npsn_code', '');

        $response = $this->middleware->handle($this->createRequest('/license-invalid'), function () {
            return new Response('Invalid Page');
        });

        $this->assertEquals('Invalid Page', $response->getContent());
    }
}
