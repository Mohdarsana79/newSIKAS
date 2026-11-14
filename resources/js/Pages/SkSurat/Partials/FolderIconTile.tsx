import { Folder } from 'lucide-react';
import type { FolderTheme } from './folderColors';

interface FolderIconTileProps {
    theme: FolderTheme;
    size?: 'sm' | 'lg';
}

const SIZE_CLASSES = {
    sm: { box: 'h-10 w-10', icon: 'h-4 w-4' },
    lg: { box: 'h-11 w-11', icon: 'h-5 w-5' },
} as const;

/** Shared Neo-Bento folder icon tile honoring preset classes and custom hex tints. */
export default function FolderIconTile({ theme, size = 'lg' }: FolderIconTileProps) {
    const dims = SIZE_CLASSES[size];

    return (
        <div
            style={theme.tileStyle}
            className={`flex ${dims.box} shrink-0 items-center justify-center rounded-2xl border ${theme.bg} ${theme.text} ${theme.border}`}
        >
            <Folder className={dims.icon} />
        </div>
    );
}
