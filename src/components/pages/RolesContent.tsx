const RolesContent = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--card-border)'
        }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Rol Yönetimi</h2>
        </div>

        {/* Role Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {['Admin', 'Manager', 'User'].map((role, i) => (
                <div
                    key={i}
                    className="phase-card"
                    style={{
                        padding: '1.5rem',
                        cursor: 'pointer',
                        transition: 'all 200ms'
                    }}
                >
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.375rem' }}>{role}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        {role === 'Admin' && 'Tam yetkili sistem yöneticisi.'}
                        {role === 'Manager' && 'Takım yönetimi yetkileri.'}
                        {role === 'User' && 'Standart kullanıcı yetkileri.'}
                    </p>
                </div>
            ))}
        </div>
    </div>
);

export default RolesContent;
