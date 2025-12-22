import type { ReactNode } from 'react';

interface NavItemProps {
    icon: ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavItem = ({ icon, label, active, onClick }: NavItemProps) => (
    <button
        onClick={onClick}
        className={`nav-item ${active ? 'nav-item-active' : ''}`}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            borderRadius: '0.5rem',
            transition: 'all 200ms ease',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: active ? 'var(--foreground)' : 'transparent',
            color: active ? 'var(--background)' : 'var(--muted-foreground)',
            fontWeight: active ? 600 : 400,
            boxShadow: active ? '0 4px 6px -1px rgba(255,255,255,0.05)' : 'none',
        }}
        onMouseEnter={(e) => {
            if (!active) {
                e.currentTarget.style.backgroundColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--foreground)';
            }
        }}
        onMouseLeave={(e) => {
            if (!active) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--muted-foreground)';
            }
        }}
    >
        <span style={{ color: active ? 'var(--background)' : 'inherit', transition: 'color 200ms' }}>{icon}</span>
        <span style={{ letterSpacing: '-0.025em' }}>{label}</span>
    </button>
);

export default NavItem;
