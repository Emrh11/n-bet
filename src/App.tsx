import {
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield, Sun,
  Users,
  X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Import styles
import './styles/theme.css';

// Import components
import DashboardContent from './components/pages/DashboardContent';
import LoginPage from './components/pages/LoginPage';
import ReportsContent from './components/pages/ReportsContent';
import RolesContent from './components/pages/RolesContent';
import SettingsContent from './components/pages/SettingsContent';
import ShiftChangeContent from './components/pages/ShiftChangeContent';
import ShiftDefinitionsContent from './components/pages/ShiftDefinitionsContent';
import ShiftSchedulerContent from './components/pages/ShiftSchedulerContent';
import StaffContent from './components/pages/StaffContent';
import NavItem from './components/ui/NavItem';
import { getAccount } from './services/accountService';
import type { Notification } from './services/notificationsService';
import { getNotificationColor, getNotificationIcon, getNotifications, markAsRead } from './services/notificationsService';
import { getAvatarUrl } from './utils/avatarUtils';

type ActivePage = 'dashboard' | 'staff' | 'schedule' | 'requests' | 'definitions' | 'reports' | 'settings' | 'roles';
type UserRole = 'admin' | 'user';

interface User {
  email: string;
  name: string;
  avatar: string;
  role: UserRole;
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // Default to true (dark) if not set, otherwise parse saved value
    return savedTheme !== null ? savedTheme === 'dark' : true;
  });

  // Save theme to localStorage and apply to html element
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auth state - load from localStorage on init
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    return !!(token && userData);
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return {
          email: parsed.email || '',
          name: parsed.name || '',
          avatar: getAvatarUrl(parsed.avatar, parsed.name),
          role: parsed.role || 'user'
        };
      } catch {
        return null;
      }
    }
    return null;
  });

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('Bildirimler yüklenemedi:', err);
    }
  }, [isLoggedIn]);

  // Fetch user profile to keep avatar/name in sync
  const fetchUserProfile = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const userData = await getAccount();
      if (userData) {
        // Update local state
        const updatedUser: User = {
          email: userData.email || '',
          name: userData.name || '',
          avatar: getAvatarUrl(userData.avatar, userData.name),
          role: (userData.role as UserRole) || 'user'
        };

        setCurrentUser(updatedUser);

        // Sync back to localStorage for next session
        const storedData = JSON.parse(localStorage.getItem('userData') || '{}');
        localStorage.setItem('userData', JSON.stringify({
          ...storedData,
          ...userData,
          avatar: userData.avatar // Store target path, getAvatarUrl handles the rest
        }));
      }
    } catch (err) {
      console.error('Profil güncellenemedi:', err);
    }
  }, [isLoggedIn]);

  // Fetch notifications and profile on login and periodically
  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
      fetchUserProfile();

      const interval = setInterval(() => {
        fetchNotifications();
        fetchUserProfile();
      }, 30000); // Her 30 saniyede bir profil ve bildirimleri kontrol et

      // Also refresh when tab becomes active
      const handleFocus = () => {
        fetchNotifications();
        fetchUserProfile();
      };

      window.addEventListener('focus', handleFocus);
      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [isLoggedIn, fetchNotifications, fetchUserProfile]);

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Hata:', err);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const handleLogin = (username: string, userData: any) => {
    // Set user data from API response
    setCurrentUser({
      email: userData.email || '',
      name: userData.name || username,
      avatar: getAvatarUrl(userData.avatar, userData.name || username),
      role: userData.role || 'user'
    });
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardContent onNavigate={(page) => setActivePage(page as ActivePage)} />;
      case 'staff': return <StaffContent />;
      case 'schedule': return <ShiftSchedulerContent userRole={currentUser?.role || 'user'} />;
      case 'requests': return <ShiftChangeContent userRole={currentUser?.role || 'user'} />;
      case 'definitions': return <ShiftDefinitionsContent userRole={currentUser?.role || 'user'} />;
      case 'reports': return <ReportsContent />;
      case 'settings': return <SettingsContent />;
      case 'roles': return <RolesContent />;
      default: return <DashboardContent onNavigate={(page) => setActivePage(page as ActivePage)} />;
    }
  };

  // Show login page if not logged in
  if (!isLoggedIn) {
    return (
      <div className={isDarkMode ? 'dark' : ''} style={{
        width: '100%',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        position: 'relative',
        backgroundColor: 'var(--background)'
      }}>
        <LoginPage
          onLogin={handleLogin}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
      </div>
    );
  }

  // Main Dashboard Layout (no PixelBlast here)
  return (
    <div className={`${isDarkMode ? 'dark' : ''}`} style={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Main Layout */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: isSidebarOpen ? '260px' : '0',
            borderRight: '1px solid var(--card-border)',
            backgroundColor: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 300ms ease',
            overflow: 'hidden',
            flexShrink: 0
          }}
        >
          {/* Logo */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <img
              src={isDarkMode ? '/icon_white.png' : '/icon_black.png'}
              alt="Logo"
              style={{
                width: '2rem',
                height: '2rem',
                objectFit: 'contain'
              }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.025em' }}>Nöbet Sistemi</span>
          </div>



          {/* Navigation */}
          <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingLeft: '0.75rem' }}>Ana Menü</span>
            </div>
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activePage === 'dashboard'} onClick={() => setActivePage('dashboard')} />
            <NavItem icon={<Users size={18} />} label="Personel" active={activePage === 'staff'} onClick={() => setActivePage('staff')} />
            <NavItem icon={<Calendar size={18} />} label="Nöbet Çizelgesi" active={activePage === 'schedule'} onClick={() => setActivePage('schedule')} />

            <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingLeft: '0.75rem' }}>Yönetim</span>
            </div>
            <NavItem icon={<ChevronRight size={18} />} label="Değişim Talepleri" active={activePage === 'requests'} onClick={() => setActivePage('requests')} />
            <NavItem icon={<FileText size={18} />} label="Nöbet Tanımları" active={activePage === 'definitions'} onClick={() => setActivePage('definitions')} />
            <NavItem icon={<Shield size={18} />} label="Rol Yönetimi" active={activePage === 'roles'} onClick={() => setActivePage('roles')} />

            <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingLeft: '0.75rem' }}>Diğer</span>
            </div>
            <NavItem icon={<Settings size={18} />} label="Ayarlar" active={activePage === 'settings'} onClick={() => setActivePage('settings')} />
          </nav>

          {/* User Section with Avatar Image */}
          <div style={{
            padding: '1rem',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--card-border)',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name || 'User'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const fallback = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.name || 'default')}`;
                  if (target.src !== fallback) {
                    target.src = fallback;
                  }
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.name || 'Kullanıcı'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                {currentUser?.email || 'email@sirket.com'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
                transition: 'color 200ms'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <header style={{
            height: '64px',
            borderBottom: '1px solid var(--card-border)',
            backgroundColor: 'var(--background)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  background: 'none',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer',
                  color: 'var(--foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--muted-foreground)' }} />
                <input
                  type="text"
                  placeholder="Ara..."
                  className="phase-input"
                  style={{
                    paddingLeft: '2.5rem',
                    width: '280px',
                    backgroundColor: 'var(--muted)',
                    border: '1px solid var(--card-border)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  background: 'none',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer',
                  color: 'var(--foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notification Button & Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    if (!isNotificationOpen) fetchNotifications(); // Açılırken güncelle
                    setIsNotificationOpen(!isNotificationOpen);
                  }}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    background: 'none',
                    border: '1px solid var(--card-border)',
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      minWidth: '16px',
                      height: '16px',
                      backgroundColor: 'rgb(239, 68, 68)',
                      borderRadius: '50%',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {isNotificationOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                      onClick={() => setIsNotificationOpen(false)}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      width: '360px',
                      maxHeight: '480px',
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '0.5rem',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                      zIndex: 50,
                      overflow: 'hidden'
                    }}>
                      {/* Header */}
                      <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--card-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(var(--muted), 0.2)'
                      }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Bildirimler</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--muted-foreground)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Tümünü okundu işaretle
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                          <div style={{
                            padding: '3rem 1rem',
                            textAlign: 'center',
                            color: 'var(--muted-foreground)'
                          }}>
                            <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <p>Henüz bildirim yok</p>
                          </div>
                        ) : (
                          notifications.map(notification => (
                            <div
                              key={notification.id}
                              style={{
                                padding: '0.875rem 1rem',
                                borderBottom: '1px solid var(--card-border)',
                                backgroundColor: notification.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                                cursor: 'pointer',
                                transition: 'background-color 150ms'
                              }}
                            >
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <span style={{
                                  fontSize: '1.25rem',
                                  flexShrink: 0,
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: `${getNotificationColor(notification.type)}20`,
                                  borderRadius: '0.375rem'
                                }}>
                                  {getNotificationIcon(notification.type)}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{
                                    fontWeight: notification.is_read ? 400 : 600,
                                    fontSize: '0.8125rem',
                                    marginBottom: '0.25rem',
                                    color: 'var(--foreground)'
                                  }}>{notification.title}</p>
                                  {notification.message && (
                                    <p style={{
                                      fontSize: '0.75rem',
                                      color: 'var(--muted-foreground)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>{notification.message}</p>
                                  )}
                                  <p style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--muted-foreground)',
                                    marginTop: '0.375rem'
                                  }}>{formatTimeAgo(notification.created_at)}</p>
                                </div>
                                {!notification.is_read && (
                                  <span style={{
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: 'rgb(59, 130, 246)',
                                    borderRadius: '50%',
                                    flexShrink: 0
                                  }} />
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
