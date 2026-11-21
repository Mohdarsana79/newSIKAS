export type ActivitySeverity = 'info' | 'warning' | 'critical';

export interface ActivityLogItem {
    id: number;
    user_id: number | null;
    actor_name: string;
    actor_username: string | null;
    actor_role: string | null;
    module: string;
    module_label: string;
    variant: string | null;
    variant_label: string | null;
    action: string;
    action_label: string;
    severity: ActivitySeverity;
    severity_label: string;
    description: string;
    route_name: string | null;
    http_method: string | null;
    url_path: string | null;
    status_code: number | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at_formatted: string | null;
    created_at_human: string | null;
}

export interface ActivityLogFilters {
    search: string;
    user_id: string;
    module: string;
    variant: string;
    action: string;
    severity: string;
    date_from: string;
    date_to: string;
    per_page: number;
}

export interface ActivityLogStats {
    total: number;
    today: number;
    critical_or_security: number;
    active_users_7d: number;
}

export interface SelectOption {
    value: string;
    label: string;
}

export interface ActivityLogUserOption {
    id: number;
    name: string;
    username: string | null;
    role: string | null;
}

export interface ActivityLogFilterOptions {
    users: ActivityLogUserOption[];
    modules: SelectOption[];
    variants: SelectOption[];
    actions: SelectOption[];
    severities: SelectOption[];
}

export interface PaginationLinkItem {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedActivityLogs {
    data: ActivityLogItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLinkItem[];
    prev_page_url: string | null;
    next_page_url: string | null;
}
