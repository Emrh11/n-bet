const ReportsContent = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div
            className="phase-card"
            style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <h3 style={{
                position: 'absolute',
                top: '1.25rem',
                left: '1.25rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                Departman Dağılımı
            </h3>
            <div style={{
                width: '10rem',
                height: '10rem',
                borderRadius: '50%',
                border: '20px solid var(--muted)',
                borderTopColor: 'var(--foreground)',
                borderRightColor: 'var(--foreground)',
                marginTop: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}></div>
        </div>
    </div>
);

export default ReportsContent;
