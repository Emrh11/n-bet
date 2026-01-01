
const SITE_URL = 'https://nobettakip.site';

export const AVATAR_STYLES = [
    'adventurer',
    'adventurer-neutral',
    'avataaars',
    'avataaars-neutral',
    'big-ears',
    'big-ears-neutral',
    'big-smile',
    'bottts',
    'bottts-neutral',
    'croodles',
    'dylan',
    'fun-emoji',
    'lorelei',
    'open-peeps',
    'personas',
    'pixel-art',
    'pixel-art-neutral'
];

/**
 * Generates a valid avatar URL for a user.
 * Format can be:
 * 1. Full URL (DiceBear API url)
 * 2. Short format: "style:seed" (e.g., "big-smile:Felix")
 * 3. Relative path: "uploads/avatar_1.png"
 * 4. Avatar ID: "avatar_1"
 */
export const getAvatarUrl = (avatar: string | null | undefined, name: string = 'User'): string => {
    // Default fallback
    const defaultUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name || 'default')}`;

    if (!avatar || avatar.trim() === '') {
        return defaultUrl;
    }

    // Case 1: Full URL
    if (avatar.startsWith('http')) {
        return avatar;
    }

    // Case 2: Short format "style:seed"
    if (avatar.includes(':')) {
        const [style, seed] = avatar.split(':');
        if (AVATAR_STYLES.includes(style)) {
            return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
        }
    }

    // Case 3: Avatar ID (Legacy/Mobile)
    if (avatar.startsWith('avatar_')) {
        // If it's just a placeholder ID, use it as a seed with default style
        return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(avatar)}`;
    }

    // Case 4: Relative path
    const cleanPath = avatar.startsWith('/') ? avatar.substring(1) : avatar;
    return `${SITE_URL}/${cleanPath}`;
};

/**
 * Normalizes DiceBear URL to short format "style:seed" for database storage
 */
export const normalizeDiceBearUrl = (url: string): string => {
    try {
        if (!url.includes('api.dicebear.com')) return url;

        const parts = url.split('/');
        const style = parts[parts.length - 2];
        const urlParams = new URL(url);
        const seed = urlParams.searchParams.get('seed') || 'default';

        return `${style}:${seed}`;
    } catch (e) {
        return url;
    }
};
