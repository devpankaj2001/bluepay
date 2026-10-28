import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Do not render bottom navigation inside dashboard route
  if (currentPath.startsWith('/dashboard')) {
    return null;
  }

  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: 'fas fa-home',
    },
    {
      label: 'Pricing',
      path: '/pricing',
      icon: 'fas fa-tags',
      badge: 'HOT',
    },
    {
      label: 'GST Calc',
      path: '/gst-calculator',
      icon: 'fas fa-calculator',
    },
    {
      label: 'Docs',
      path: '/docs',
      icon: 'fas fa-book',
    },
    {
      label: 'Contact',
      path: '/contact',
      icon: 'fas fa-headset',
    },
  ];

  return (
    <>
      {/* Spacer to prevent content overlap at bottom */}
      <div className="bottom-nav-spacer" style={{ height: '70px', display: 'block' }}></div>

      <nav className="ez-bottom-nav">
        <div className="ez-bottom-nav-container">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`ez-bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="ez-bottom-nav-icon-wrap">
                  <i className={item.icon}></i>
                  {item.badge && (
                    <span className="ez-bottom-nav-badge">{item.badge}</span>
                  )}
                </div>
                <span className="ez-bottom-nav-label">{item.label}</span>
                {isActive && <div className="ez-bottom-nav-indicator" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
