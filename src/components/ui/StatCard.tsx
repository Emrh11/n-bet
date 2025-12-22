import type { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string;
    trend: string;
    trendUp: boolean | null;
    icon: ReactNode;
}

const StatCard = ({ title, value, trend, trendUp, icon }: StatCardProps) => (
    <div
        className="phase-card"
        style={{
            padding: '1.5rem',
            transition: 'all 300ms ease',
            background: 'linear-gradient(to bottom, var(--card), var(--background))',
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                {title}
            </h3>
            <div style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)',
                border: '1px solid var(--card-border)',
                transition: 'color 200ms'
            }}>
                {icon}
            </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <p style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.05em' }}>{value}</p>
            {trendUp !== null && (
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    color: trendUp ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)',
                    backgroundColor: trendUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    border: `1px solid ${trendUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                }}>
                    {trend}
                </span>
            )}
        </div>
    </div>
);

export default StatCard;
