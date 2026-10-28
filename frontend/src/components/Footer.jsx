import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="pf">
            {/* pf-top */}
            <div className="pf-top">
                <div className="container">
                    <div className="row flex flex-wrap" style={{ display: 'flex', flexWrap: 'wrap' }}>
                        
                        {/* Brand Column */}
                        <div className="col-lg-4 col-md-6 mb-4 lg:pr-12" style={{ flex: '0 0 33.333%', maxWidth: '33.333%', minWidth: '280px' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <img src="/assets/logo/logo.png" alt="BluePay" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
                            </div>
                            <p className="pf-desc">
                                We combine modern web/mobile architecture with robust backend engineering to design and build custom FinTech systems, AI portals, and enterprise software.
                            </p>
                            <div className="pf-social flex gap-2">
                                <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                                <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                                <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                                <a href="https://wa.me/919216034016" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
                            </div>
                        </div>

                        {/* Quick Links Column */}
                        <div className="col-lg-2 col-md-6 mb-4" style={{ flex: '0 0 16.666%', maxWidth: '16.666%', minWidth: '150px' }}>
                            <h3 className="pf-heading">Company</h3>
                            <ul className="pf-links">
                                <li><Link to="/about">About Us</Link></li>
                                <li><Link to="/about">Our Team</Link></li>
                                <li><Link to="/about">Why Choose Us</Link></li>
                                <li><Link to="/contact">Contact Support</Link></li>
                            </ul>
                        </div>

                        {/* Services Column */}
                        <div className="col-lg-2 col-md-6 mb-4" style={{ flex: '0 0 16.666%', maxWidth: '16.666%', minWidth: '150px' }}>
                            <h3 className="pf-heading">Services</h3>
                            <ul className="pf-links">
                                <li><Link to="/contact">Web Applications</Link></li>
                                <li><Link to="/contact">Mobile Apps</Link></li>
                                <li><Link to="/contact">SaaS Platforms</Link></li>
                                <li><Link to="/contact">AI Development</Link></li>
                            </ul>
                        </div>

                        {/* Policies Column */}
                        <div className="col-lg-2 col-md-6 mb-4" style={{ flex: '0 0 16.666%', maxWidth: '16.666%', minWidth: '150px' }}>
                            <h3 className="pf-heading">Policies</h3>
                            <ul className="pf-links">
                                <li><Link to="/refund">Refund Policy</Link></li>
                                <li><Link to="/privacy">Privacy Policy</Link></li>
                                <li><Link to="/terms">Terms & Condition</Link></li>
                                <li><Link to="/gst-calculator">GST Calculator</Link></li>
                            </ul>
                        </div>

                        {/* Contact Info Column */}
                        <div className="col-lg-2 col-md-6 mb-4" style={{ flex: '0 0 16.666%', maxWidth: '16.666%', minWidth: '220px' }}>
                            <h3 className="pf-heading">Contact Us</h3>
                            <div className="pf-contact-row">
                                <span className="pf-ci"><i className="fas fa-phone"></i></span>
                                <a href="tel:+919216034016">+91-9216034016</a>
                            </div>
                            <div className="pf-contact-row">
                                <span className="pf-ci"><i className="fas fa-envelope"></i></span>
                                <a href="mailto:contact@bluepay.in">contact@bluepay.in</a>
                            </div>
                            <div className="pf-contact-row" style={{ alignItems: 'flex-start' }}>
                                <span className="pf-ci" style={{ marginTop: '2px' }}><i className="fas fa-map-marker-alt"></i></span>
                                <p style={{ fontSize: '12px' }}>
                                    Trimurty Prime Tower, Niwaru Road, Jhotwara, Jaipur, 302012 Rajasthan
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* pf-mid (Startup recognition bar) */}
            <div className="pf-mid">
                <div className="container">
                    <div className="pf-company">
                        <i className="fas fa-award"></i>
                        <span>Recognized by <strong>DPIIT (#startupindia)</strong> as an innovative software engineering contributor</span>
                        <span className="sep">|</span>
                        <span>CMMI Level 5 Process Standards</span>
                        <span className="sep">|</span>
                        <span>PCI-DSS Secure Platform Standard</span>
                    </div>
                </div>
            </div>

            {/* pf-bot */}
            <div className="pf-bot">
                <div className="container flex flex-col md:flex-row items-center justify-between" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <p>
                        &copy; 2026 <strong>BluePay</strong> by BluePay International. All Rights Reserved.
                    </p>
                    <div className="pf-bot-links">
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/terms">Terms of Service</Link>
                        <Link to="/refund">Refund Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
