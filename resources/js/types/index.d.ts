export interface User {
    id: number;
    name: string;
    email: string;
    username: string;
    is_security_code_enabled: boolean;
    email_verified_at?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
