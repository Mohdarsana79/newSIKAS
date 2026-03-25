import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    color?: string;
    description?: string;
    tooltip?: string;
}

export default function StatCard({ title, value, icon, color = 'bg-white', description, tooltip }: StatCardProps) {
    return (
        <div className={`overflow-hidden rounded-xl shadow-lg ${color} dark:bg-gray-800 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl group`}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                    <p
                        className="mt-2 text-3xl font-bold text-gray-800 dark:text-gray-100 cursor-help"
                        title={tooltip}
                    >
                        {value}
                    </p>
                    {description && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>}
                </div>
                {icon && <div className="rounded-full bg-opacity-20 p-3 bg-gray-200 dark:bg-gray-700 group-hover:bg-opacity-30 transition-all">{icon}</div>}
            </div>
        </div>
    );
}
