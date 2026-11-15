<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => function () use ($request) {
                    $user = $request->user();
                    if (! $user) {
                        return null;
                    }

                    return array_merge($user->toArray(), [
                        'role' => $user->role ?? 'bendahara',
                        'is_kepala_sekolah' => $user->isKepalaSekolah(),
                        'is_bendahara' => $user->isBendahara(),
                    ]);
                },
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'warning' => fn () => $request->session()->get('warning'),
                'error' => fn () => $request->session()->get('error'),
                'show_changelog' => fn () => $request->session()->get('show_changelog'),
            ],
        ];
    }
}
