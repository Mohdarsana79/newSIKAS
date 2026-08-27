import { usePage } from '@inertiajs/react';

/**
 * A wrapper around Ziggy's route() helper that automatically prepends
 * the current variant's routePrefix to the route name.
 * 
 * Example usage:
 * const vRoute = useVariantRoute();
 * href={vRoute('penganggaran.index')} 
 * // Output for Kinerja: "kinerja-penganggaran.index"
 */
export default function useVariantRoute() {
    // The routePrefix is now injected by the Base Controller for all variants
    const { routePrefix } = usePage<any>().props;

    return (routeName: string, params?: any, absolute?: boolean, config?: any) => {
        // Construct the expected prefixed route name
        const prefix = routePrefix || '';
        const prefixedName = `${prefix}${routeName}`;

        // Fallback to original routeName if the prefixed one doesn't exist in Ziggy
        // This is useful for global routes like 'dashboard', 'profile.edit'
        // @ts-ignore
        if (window.route && typeof window.route().has === 'function') {
            // @ts-ignore
            if (window.route().has(prefixedName)) {
                // @ts-ignore
                return route(prefixedName, params, absolute, config);
            }
        }

        // @ts-ignore
        return route(routeName, params, absolute, config);
    };
}
