export function extractAxiosErrorMessage(err: unknown, fallback: string): string {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const res = (err as { response?: { data?: { message?: unknown } } }).response;
        if (typeof res?.data?.message === 'string' && res.data.message.trim() !== '') {
            return res.data.message;
        }
    }
    return fallback;
}

export function extractAxiosErrorData<T>(err: unknown): T | null {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const res = (err as { response?: { data?: unknown } }).response;
        if (res && typeof res.data === 'object' && res.data !== null) {
            return res.data as T;
        }
    }
    return null;
}
