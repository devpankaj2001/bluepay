import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Track scroll to apply scrolled styling
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setIsMenuOpen(false);
    };

    const toggleDropdown = (name) => {
        if (activeDropdown === name) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(name);
        }
    };

    return (
        <header className="fixed-top" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1030 }}>
            {/* ── ELITE TOP BAR ── */}
            <div className="ez-topbar">
                <div className="ez-topbar-inner">
                    <div className="ez-topbar-left">
                        <span className="ez-offer-text">
                            <span className="offer-highlight" style={{ color: '#4B5CE4' }}>Early-Stage Founder Offer</span> &ndash; Save Up to 15% on Your Project
                            <Link to="/pricing" style={{ color: '#818CF8', fontWeight: 600, marginLeft: '10px', textDecoration: 'underline' }}>
                                View Pricing (Web ₹14,500+ / App ₹20,000+)
                            </Link>
                        </span>
                    </div>
                    <div className="ez-topbar-right">
                        <a href="tel:+919216034016" className="ez-phone-link">
                            <img src="https://flagcdn.com/w20/in.png" alt="IN" className="ez-country-flag" width="20" height="14" style={{ marginRight: '6px' }} />
                            <i className="fas fa-phone" style={{ marginRight: '6px', color: '#4B5CE4' }}></i>
                            <span>+91 9216034016</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* ── ELITE MAIN NAV ── */}
            <div className={`mainmenu-area ${scrolled ? 'scrolled' : ''}`} id="mainmenu-area" style={{ transition: 'all 0.3s' }}>
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <nav className="navbar navbar-expand-lg flex justify-between items-center" style={{ display: 'flex', width: '100%' }}>
                                {/* Logo */}
                                <Link className="navbar-brand flex items-center gap-2" to="/">
                                    <img src="/assets/logo/logo.png" alt="BluePay" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
                                </Link>

                                {/* Hamburger Menu button for mobile */}
                                <button
                                    className="navbar-toggler premium-toggler lg:hidden"
                                    type="button"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    aria-expanded={isMenuOpen}
                                    style={{ border: 'none', background: 'transparent' }}
                                >
                                    <span className="toggler-bar"></span>
                                    <span className="toggler-bar"></span>
                                    <span className="toggler-bar"></span>
                                </button>

                                {/* Nav Links */}
                                <div className={`navbar-collapse ${isMenuOpen ? 'show block' : 'hidden lg:flex'}`} id="main_menu" style={{ flexGrow: 1 }}>
                                    <ul className="navbar-nav ml-auto flex items-center" style={{ marginLeft: 'auto', display: 'flex', flexDirection: isMenuOpen ? 'column' : 'row' }}>

                                        {/* Company Dropdown */}
                                        <li className={`nav-item dropdown ${activeDropdown === 'company' ? 'show' : ''}`}>
                                            <a className="nav-link dropdown-toggle cursor-pointer" onClick={() => toggleDropdown('company')}>
                                                Company <span className="nav-caret"></span>
                                            </a>
                                            <div className={`dropdown-menu ${activeDropdown === 'company' ? 'show block' : ''}`} style={{ left: 0 }}>
                                                <Link className="dropdown-item" to="/about" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-info-circle dd-icon"></i> About Us</Link>
                                                <Link className="dropdown-item" to="/about" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-users dd-icon"></i> Our Team</Link>
                                                <Link className="dropdown-item" to="/about" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-handshake dd-icon"></i> Our Partners</Link>
                                                <Link className="dropdown-item" to="/about" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-star dd-icon"></i> Why Choose Us</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-briefcase dd-icon"></i> Case Studies</Link>
                                                <Link className="dropdown-item" to="/docs" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-newspaper dd-icon"></i> Blog & Desk</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-envelope dd-icon"></i> Contact Us</Link>
                                            </div>
                                        </li>

                                        {/* Services Mega Dropdown */}
                                        <li className={`nav-item dropdown ez-mega ${activeDropdown === 'services' ? 'show' : ''}`}>
                                            <a className="nav-link dropdown-toggle cursor-pointer" onClick={() => toggleDropdown('services')}>
                                                Services <span className="nav-caret"></span>
                                            </a>
                                            <div className={`dropdown-menu ${activeDropdown === 'services' ? 'show block' : ''}`}>
                                                <div className="container">
                                                    <div className="ez-mega-grid">
                                                        <div className="ez-mega-col">
                                                            <div className="ez-mega-col-label">Frontend & Client</div>
                                                            <Link to="/pricing" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-desktop"></i></span>
                                                                <span className="svc-info"><span className="svc-name">Web Development</span><span className="svc-desc">React, Next.js, and custom dashboards (From ₹14,500)</span></span>
                                                            </Link>
                                                            <Link to="/pricing" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-mobile-screen"></i></span>
                                                                <span className="svc-info"><span className="svc-name">Mobile Apps</span><span className="svc-desc">iOS, Android, and Flutter (From ₹20,000)</span></span>
                                                            </Link>
                                                            <Link to="/contact" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-wand-magic-sparkles"></i></span>
                                                                <span className="svc-info"><span className="svc-name">UI/UX Design</span><span className="svc-desc">Interactive high-fidelity prototypes</span></span>
                                                            </Link>
                                                        </div>
                                                        <div className="ez-mega-col">
                                                            <div className="ez-mega-col-label">Backend & Intelligence</div>
                                                            <Link to="/contact" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-brain"></i></span>
                                                                <span className="svc-info"><span className="svc-name">AI & Machine Learning</span><span className="svc-desc">LLMs, recommendation engines, automation</span></span>
                                                            </Link>
                                                            <Link to="/contact" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-server"></i></span>
                                                                <span className="svc-info"><span className="svc-name">SaaS Architecture</span><span className="svc-desc">Multi-tenant core platforms designed to scale</span></span>
                                                            </Link>
                                                            <Link to="/contact" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-database"></i></span>
                                                                <span className="svc-info"><span className="svc-name">Database Engineering</span><span className="svc-desc">Optimized SQL, replication and query tuning</span></span>
                                                            </Link>
                                                        </div>
                                                        <div className="ez-mega-col">
                                                            <div className="ez-mega-col-label">Infrastructure & Security</div>
                                                            <Link to="/contact" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-cloud"></i></span>
                                                                <span className="svc-info"><span className="svc-name">Cloud Server Solutions</span><span className="svc-desc">AWS, Azure & GCP configuration</span></span>
                                                            </Link>
                                                            <Link to="/contact" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-shield-halved"></i></span>
                                                                <span className="svc-info"><span className="svc-name">Cyber Security</span><span className="svc-desc">Penetration testing & app hardening</span></span>
                                                            </Link>
                                                            <Link to="/contact" className="ez-svc-card" onClick={() => setIsMenuOpen(false)}>
                                                                <span className="svc-icon"><i className="fas fa-route"></i></span>
                                                                <span className="svc-info"><span className="svc-name">API Development</span><span className="svc-desc">Clean RESTful and GraphQL endpoints</span></span>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>

                                        {/* Solutions Dropdown */}
                                        <li className={`nav-item dropdown ${activeDropdown === 'solutions' ? 'show' : ''}`}>
                                            <a className="nav-link dropdown-toggle cursor-pointer" onClick={() => toggleDropdown('solutions')}>
                                                Solutions <span className="nav-caret"></span>
                                            </a>
                                            <div className={`dropdown-menu ${activeDropdown === 'solutions' ? 'show block' : ''}`} style={{ left: 0 }}>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-shopping-cart dd-icon"></i> E-Commerce Solutions</Link>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-chart-line dd-icon"></i> FinTech &amp; Payouts</Link>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-users-gear dd-icon"></i> CRM &amp; ERP Development</Link>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-heart-pulse dd-icon"></i> Healthcare Tech</Link>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-graduation-cap dd-icon"></i> EdTech Solutions</Link>
                                            </div>
                                        </li>

                                        {/* Servers Dropdown */}
                                        <li className={`nav-item dropdown ${activeDropdown === 'servers' ? 'show' : ''}`}>
                                            <a className="nav-link dropdown-toggle cursor-pointer" onClick={() => toggleDropdown('servers')}>
                                                Servers <span className="nav-caret"></span>
                                            </a>
                                            <div className={`dropdown-menu ${activeDropdown === 'servers' ? 'show block' : ''}`} style={{ left: 0 }}>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-server dd-icon"></i> VPS Hosting</Link>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-cloud-sun dd-icon"></i> Cloud Hosting</Link>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-microchip dd-icon"></i> Dedicated Servers</Link>
                                                <Link className="dropdown-item" to="/signup" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-network-wired dd-icon"></i> Server Monitoring</Link>
                                            </div>
                                        </li>

                                        {/* Industries Dropdown */}
                                        <li className={`nav-item dropdown ${activeDropdown === 'industries' ? 'show' : ''}`}>
                                            <a className="nav-link dropdown-toggle cursor-pointer" onClick={() => toggleDropdown('industries')}>
                                                Industries <span className="nav-caret"></span>
                                            </a>
                                            <div className={`dropdown-menu ${activeDropdown === 'industries' ? 'show block' : ''}`} style={{ left: 0 }}>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-shopping-bag dd-icon"></i> Retail &amp; E-Commerce</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-coins dd-icon"></i> Finance &amp; FinTech</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-truck dd-icon"></i> Logistics &amp; Supply Chain</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-industry dd-icon"></i> Manufacturing Systems</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fas fa-hospital dd-icon"></i> Healthcare &amp; Pharma</Link>
                                            </div>
                                        </li>

                                        {/* Technologies Dropdown */}
                                        <li className={`nav-item dropdown ${activeDropdown === 'technologies' ? 'show' : ''}`}>
                                            <a className="nav-link dropdown-toggle cursor-pointer" onClick={() => toggleDropdown('technologies')}>
                                                Technologies <span className="nav-caret"></span>
                                            </a>
                                            <div className={`dropdown-menu ${activeDropdown === 'technologies' ? 'show block' : ''}`} style={{ left: 0 }}>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fab fa-react dd-icon"></i> React / Flutter</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fab fa-node-js dd-icon"></i> Node.js / Express</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fab fa-aws dd-icon"></i> AWS / Cloud infrastructure</Link>
                                                <Link className="dropdown-item" to="/contact" onClick={() => { setIsMenuOpen(false); setActiveDropdown(null); }}><i className="fab fa-docker dd-icon"></i> Docker / Kubernetes</Link>
                                            </div>
                                        </li>

                                         {/* Pricing link */}
                                         <li className="nav-item">
                                             <Link className="nav-link" to="/pricing" onClick={() => setIsMenuOpen(false)}>
                                                 <i className="fas fa-tags" style={{ marginRight: '4px', fontSize: '13px', color: '#4B5CE4' }}></i> Pricing
                                             </Link>
                                         </li>

                                         {/* GST Calculator link */}
                                         <li className="nav-item">
                                             <Link className="nav-link" to="/gst-calculator" onClick={() => setIsMenuOpen(false)}>
                                                 <i className="fas fa-calculator" style={{ marginRight: '4px', fontSize: '13px' }}></i> GST Calculator
                                             </Link>
                                         </li>

                                        {/* Dynamic Auth CTA buttons */}
                                        {user ? (
                                            <>
                                                <li className="nav-item">
                                                    <span className="nav-link text-white font-medium opacity-80" style={{ pointerEvents: 'none' }}>
                                                        Hello, {user.firstName}
                                                    </span>
                                                </li>
                                                <li className="nav-item">
                                                    <Link to="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                                                        <i className="fas fa-chart-line" style={{ marginRight: '6px' }}></i> Dashboard
                                                    </Link>
                                                </li>
                                                <li className="nav-item ez-cta">
                                                    <button
                                                        onClick={handleLogout}
                                                        className="nav-link cursor-pointer"
                                                        style={{ border: 'none', background: 'transparent' }}
                                                    >
                                                        <i className="fas fa-sign-out-alt" style={{ marginRight: '6px' }}></i> Logout
                                                    </button>
                                                </li>
                                            </>
                                        ) : (
                                            <>
                                                <li className="nav-item">
                                                    <Link to="/login" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                                                        Login
                                                    </Link>
                                                </li>
                                                <li className="nav-item ez-cta">
                                                    <Link to="/contact" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                                                        Get Proposal <i className="fas fa-arrow-right" style={{ marginLeft: '6px' }}></i>
                                                    </Link>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
