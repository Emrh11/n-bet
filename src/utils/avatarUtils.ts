
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
 * Handles relative paths from the server and provides a DiceBear fallback with proper encoding.
 * 
 * @param avatar The avatar path or URL from the database
 * @param name The name to use as a seed for the fallback avatar
 * @returns A full URL string
 */
export const getAvatarUrl = (avatar: string | null | undefined, name: string = 'User'): string => {
    const fallbackUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name || 'default')}`;

    if (!avatar || avatar.trim() === '') {
        return fallbackUrl;
    }

    if (avatar.startsWith('http')) {
        return avatar;
    }

    // If it's a relative path (e.g., 'uploads/avatar_1.png'), prepend the site URL
    const cleanPath = avatar.startsWith('/') ? avatar.substring(1) : avatar;
    return `${SITE_URL}/${cleanPath}`;
};
