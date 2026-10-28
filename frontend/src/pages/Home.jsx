import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Home = () => {
    // Testimonial Carousel State
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const carouselRef = useRef(null);

    const testimonials = [
        {
            text: "Our organic traffic more than doubled within a few months of the SEO and content work BluePay set up. What stood out was how clearly they explained the strategy, not just the results.",
            author: "Sneha Reddy",
            role: "Marketing Director",
            initials: "SR",
            color: "hsl(24, 70%, 45%)"
        },
        {
            text: "Rolling out a unified POS and inventory system across 12 stores sounded risky, but the phased rollout plan meant we never lost a single day of billing.",
            author: "Vikram Choudhary",
            role: "Retail Chain Owner",
            initials: "VC",
            color: "hsl(200, 45%, 45%)"
        },
        {
            text: "Patient data security was non-negotiable for us. BluePay walked us through their access-control approach in detail before we signed off on the architecture.",
            author: "Ananya Iyer",
            role: "Healthcare Administrator",
            initials: "AI",
            color: "hsl(280, 50%, 40%)"
        },
        {
            text: "Integrating BluePay's automated ledger systems cut down our end-of-month reconciliation times by over 80%.",
            author: "Rohan Mehta",
            role: "FinTech Founder",
            initials: "RM",
            color: "hsl(140, 60%, 30%)"
        },
        {
            text: "Their containerized microservices scaling approach handled our Black Friday traffic spikes without a single hiccup.",
            author: "Priya Sharma",
            role: "SaaS CTO",
            initials: "PS",
            color: "hsl(340, 60%, 35%)"
        },
        {
            text: "BluePay restructured our driver dispatch algorithms, bringing pickup wait times down from 20 minutes to under 5.",
            author: "Kabir Malhotra",
            role: "Logistics Architect",
            initials: "KM",
            color: "hsl(40, 70%, 35%)"
        },
        {
            text: "The clean API architecture and dynamic dashboards they delivered enabled our team to launch our new subscription tiers smoothly.",
            author: "Neha Gupta",
            role: "EdTech Product Manager",
            initials: "NG",
            color: "hsl(180, 75%, 25%)"
        },
        {
            text: "Their security squad identified and patched critical edge-case vulnerabilities in our legacy auth before switchover.",
            author: "Devansh Dixit",
            role: "Security Lead",
            initials: "DD",
            color: "hsl(220, 65%, 35%)"
        },
        {
            text: "Collaborating on the design system with BluePay was fantastic; they executed our custom styling details perfectly.",
            author: "Tara Dsouza",
            role: "UI Designer",
            initials: "TD",
            color: "hsl(310, 55%, 35%)"
        }
    ];

    const scrollToTestimonial = (index) => {
        setActiveTestimonial(index);
        if (carouselRef.current) {
            const cards = carouselRef.current.children;
            if (cards[index]) {
                cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    };

    const handlePrevTestimonial = () => {
        const nextIndex = (activeTestimonial - 1 + testimonials.length) % testimonials.length;
        scrollToTestimonial(nextIndex);
    };

    const handleNextTestimonial = () => {
        const nextIndex = (activeTestimonial + 1) % testimonials.length;
        scrollToTestimonial(nextIndex);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
            <Navbar />
            {/* Header Offset */}
            <div style={{ height: '114px' }}></div>

            {/* ── HERO SECTION ── */}
            <section className="bg-white text-slate-900 relative pt-20 pb-28 border-b border-slate-100">
                <div className="container">
                    <div className="text-center max-w-[960px] mx-auto">
                        <div className="px-eyebrow border border-indigo-200 bg-indigo-50/50 text-[#2F49C8] px-4 py-1.5 rounded-full inline-flex items-center gap-2 mx-auto mb-8">
                            <i className="far fa-check-circle"></i> Trusted by 500+ businesses
                        </div>
                        <h1 className="text-slate-900 font-extrabold text-5xl md:text-6xl lg:text-[70px] tracking-tight leading-[1.1] max-w-[920px] mx-auto mb-6">
                            The Future of <span className="text-[#2F49C8]">Multiple Marketplace</span> Businesses Payment Solution
                        </h1>
                        <p className="text-slate-500 max-w-[645px] mx-auto text-lg md:text-xl leading-relaxed mb-8">
                            Complete Payment solution with commission-based pricing. Instant payouts, secure API integration.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/apply" className="px-btn bg-[#2F49C8] hover:bg-[#1D35B3] text-white font-semibold flex items-center gap-2 px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all">
                                Apply Now
                                <i className="fas fa-arrow-right"></i>
                            </Link>
                            <Link to="/contact" className="px-btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2 px-6 py-3 rounded-lg transition-all">
                                View Documentation
                            </Link>
                        </div>
                    </div>
                </div>
            </section>



            {/* ── CAPABILITIES (BENTO GRID) ── */}
            <section className="px-section bg-white text-slate-900">
                <div className="container">
                    <div className="px-sh px-sh-center">
                        <div className="px-eyebrow text-[#2F49C8] bg-indigo-500/10 border border-indigo-500/20"><i className="fas fa-cubes"></i> WHAT WE BUILD</div>
                        <h2 className="px-h2 px-display text-slate-900">Full-Stack Capability, Enterprise Discipline</h2>
                        <p className="px-lead mx-auto text-slate-600">From product strategy to long-term operations &mdash; one accountable team across the entire lifecycle.</p>
                    </div>

                    <div className="px-bento-grid grid-rows-[auto]">
                        <Link to="/contact" className="px-bento-tile px-bento-tile-hero px-dark px-mesh row-span-2">
                            <div className="px-eyebrow mb-4">FEATURED SERVICE</div>
                            <h3 className="px-h3 text-white text-[28px]">AI &amp; Intelligent Automation</h3>
                            <p className="px-feature-text text-slate-200/90 max-w-[420px]">
                                Logistics, document automation, and intelligent support APIs, hand-coded directly into your core operating workflows.
                            </p>
                            <span className="px-feature-link text-white">Explore Service <i className="fas fa-arrow-right ml-[6px]"></i></span>
                        </Link>
                        
                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-desktop"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">Web Development</h4>
                            <p className="px-bento-blurb text-slate-500">Custom responsive websites and web platforms.</p>
                            <span className="px-bento-count text-[#2F49C8]">7 services</span>
                        </Link>
                        
                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-mobile-alt"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">Mobile App Development</h4>
                            <p className="px-bento-blurb text-slate-500">Native and hybrid platform apps for iOS &amp; Android.</p>
                            <span className="px-bento-count text-[#2F49C8]">6 services</span>
                        </Link>

                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-code"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">Software Development</h4>
                            <p className="px-bento-blurb text-slate-500">Custom business software built around your workflows.</p>
                            <span className="px-bento-count text-[#2F49C8]">5 services</span>
                        </Link>

                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-wallet"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">FinTech Solutions</h4>
                            <p className="px-bento-blurb text-slate-500">Compliance-ready payment and lending platforms.</p>
                            <span className="px-bento-count text-[#2F49C8]">4 services</span>
                        </Link>

                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-shopping-cart"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">E-Commerce Development</h4>
                            <p className="px-bento-blurb text-slate-500">Retail and multi-tenant marketplace platforms.</p>
                            <span className="px-bento-count text-[#2F49C8]">3 services</span>
                        </Link>

                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-bullhorn"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">Digital Marketing</h4>
                            <p className="px-bento-blurb text-slate-500">SEO, PPC and growth setups for tech companies.</p>
                            <span className="px-bento-count text-[#2F49C8]">3 services</span>
                        </Link>



                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-brain"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">Artificial Intelligence</h4>
                            <p className="px-bento-blurb text-slate-500">Prediction &amp; automation design blueprints.</p>
                            <span className="px-bento-count text-[#2F49C8]">3 services</span>
                        </Link>

                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-shield-alt"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">Cyber Security</h4>
                            <p className="px-bento-blurb text-slate-500">Security hardening for your applications and infra.</p>
                            <span className="px-bento-count text-[#2F49C8]">4 services</span>
                        </Link>

                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-palette"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">UI UX Design</h4>
                            <p className="px-bento-blurb text-slate-500">Interfaces people actually enjoy using.</p>
                            <span className="px-bento-count text-[#2F49C8]">3 services</span>
                        </Link>

                        <Link to="/contact" className="px-bento-tile bg-white border border-slate-200">
                            <span className="px-bento-corner"><i className="fas fa-arrow-right"></i></span>
                            <span className="px-icon-circle px-icon-circle-md"><i className="fas fa-layer-group"></i></span>
                            <h4 className="px-h3 text-[16.5px] mt-4 text-slate-900">IT Consulting</h4>
                            <p className="px-bento-blurb text-slate-500">Scoping audits and architecture blueprints.</p>
                            <span className="px-bento-count text-[#2F49C8]">5 services</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── OUR METHODOLOGY (ZIGZAG) ── */}
            <section className="px-section px-section-tight bg-white text-slate-900">
                <div className="container">
                    <div className="px-sh px-sh-center">
                        <div className="px-eyebrow text-[#2F49C8] bg-indigo-500/10 border border-indigo-500/20"><i className="fas fa-award"></i> WHY STRUCTURAL TRANSCENDENCE MATTER?</div>
                        <h2 className="px-h2 px-display text-slate-900">Built for Businesses That Can't Afford to Get It Wrong</h2>
                    </div>

                    <div className="px-zigzag">
                        <div className="px-zigzag-row">
                            <div className="px-zigzag-num">01</div>
                            <div>
                                <h3 className="px-h3 text-slate-900">Enterprise-grade security by default</h3>
                                <p className="px-feature-text text-slate-600">Three-stage sandboxing, environment isolation, and SQL injection security sweeps are run by default &mdash; not locked as addons later.</p>
                            </div>
                        </div>
                        <div className="px-zigzag-row is-reversed">
                            <div className="px-zigzag-num">02</div>
                            <div>
                                <h3 className="px-h3 text-slate-900">One accountable team, every timezone</h3>
                                <p className="px-feature-text text-slate-600">With delivery frameworks tuned to this level, your project has continuous coverage without the handoff delays of outsourcing.</p>
                            </div>
                        </div>
                        <div className="px-zigzag-row">
                            <div className="px-zigzag-num">03</div>
                            <div>
                                <h3 className="px-h3 text-slate-900">Architecture that outlives the launch</h3>
                                <p className="px-feature-text text-slate-600">We design for the next five years of scale, documented APIs, and maintainable code from day one.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── COMMON PORTALS (MOCK DASHBOARD) ── */}
            <section className="px-section-tight bg-white text-slate-900">
                <div className="container">
                    <div className="px-case-spotlight bg-slate-50 border border-slate-100 rounded-2xl p-10">
                        {/* Mock Dashboard Frame */}
                        <div className="px-case-media px-browser-frame">
                            <div className="px-browser-bar"><span></span><span></span><span></span></div>
                            <div className="px-mock-dashboard">
                                <div className="px-mock-topnav">
                                    <span className="px-mock-logo"></span>
                                    <span className="px-mock-navpill px-mock-navpill-active"></span>
                                    <span className="px-mock-navpill"></span>
                                    <span className="px-mock-navpill"></span>
                                    <span className="px-mock-avatar"></span>
                                </div>
                                <div className="px-mock-body">
                                    <div className="px-mock-sidebar">
                                        <span className="px-mock-sidebar-item px-mock-sidebar-active"></span>
                                        <span className="px-mock-sidebar-item"></span>
                                        <span className="px-mock-sidebar-item"></span>
                                        <span className="px-mock-sidebar-item"></span>
                                        <span className="px-mock-sidebar-item"></span>
                                    </div>
                                    <div className="px-mock-main">
                                        <div className="px-mock-stats-row">
                                            <div className="px-mock-stat-card"><span className="px-mock-stat-num">₹50Cr+</span><span className="px-mock-stat-label">Processed</span></div>
                                            <div className="px-mock-stat-card"><span className="px-mock-stat-num">10K+</span><span className="px-mock-stat-label">Merchants</span></div>
                                            <div className="px-mock-stat-card"><span className="px-mock-stat-num">99.9%</span><span className="px-mock-stat-label">Success Rate</span></div>
                                        </div>
                                        <div className="px-mock-chart-row">
                                            <div className="px-mock-bar-chart">
                                                <span style={{ height: '38%' }}></span>
                                                <span style={{ height: '62%' }}></span>
                                                <span style={{ height: '48%' }}></span>
                                                <span style={{ height: '80%' }}></span>
                                                <span style={{ height: '58%' }}></span>
                                                <span style={{ height: '92%' }}></span>
                                                <span style={{ height: '72%' }}></span>
                                            </div>
                                            <div className="px-mock-donut"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Text Block */}
                        <div className="px-case-body">
                            <div className="px-eyebrow text-[#2F49C8] bg-indigo-500/10 border border-indigo-500/20"><i className="fas fa-window-restore"></i> PORTFOLIO CASE STUDY</div>
                            <h3 className="px-h2 px-display text-slate-900 text-left text-[32px]">Custom Software &amp; Web Platform</h3>
                            <p className="px-feature-text text-[15.5px] text-slate-600">
                                A custom enterprise web platform with real-time analytics dashboard, built to give leadership a single-pane view across web, mobile, and backend systems &mdash; with security and availability designed in from day one.
                            </p>
                            <div className="px-case-metrics">
                                <div><strong>6 wks</strong><span className="text-slate-500">To first release</span></div>
                                <div><strong>99.9%</strong><span className="text-slate-500">SLA Uptime</span></div>
                                <div><strong>4</strong><span className="text-slate-500">Active dev</span></div>
                            </div>
                            <Link to="/contact" className="px-btn px-btn-outline-dark">
                                Read the Full Story
                                <i className="fas fa-arrow-right ml-2"></i>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS COUNTER ROW ── */}
            <section className="px-section px-section-tight px-dark px-mesh bg-slate-900">
                <div className="container">
                    <div className="px-stats-row">
                        <div className="px-stat">
                            <div className="px-stat-icon"><i className="fas fa-calendar-check"></i></div>
                            <div className="px-stat-value">18+</div>
                            <div className="px-stat-label">Years of Collective Experience</div>
                        </div>
                        <div className="px-stat">
                            <div className="px-stat-icon"><i className="fas fa-building"></i></div>
                            <div className="px-stat-value">1</div>
                            <div className="px-stat-label">Corporate Office</div>
                        </div>
                        <div className="px-stat">
                            <div className="px-stat-icon"><i className="fas fa-rocket"></i></div>
                            <div className="px-stat-value">700+</div>
                            <div className="px-stat-label">Production Systems Deployed</div>
                        </div>
                        <div className="px-stat">
                            <div className="px-stat-icon"><i className="fab fa-github"></i></div>
                            <div className="px-stat-value">1500+</div>
                            <div className="px-stat-label">GitHub Repositories Created</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── INDUSTRIES WE UNDERSTAND ── */}
            <section className="px-section bg-white text-slate-900">
                <div className="container">
                    <div className="px-sh px-sh-center">
                        <div className="px-eyebrow text-[#2F49C8] bg-indigo-500/10 border border-indigo-500/20"><i className="fas fa-industry"></i> Industries</div>
                        <h2 className="px-h2 px-display text-slate-900">Industries We Understand Deeply</h2>
                        <p className="px-lead mx-auto text-slate-600">Different business verticals have their own specific operational rules and database requirements &mdash; we support all of them.</p>
                    </div>
                </div>
                <div className="px-mosaic-wrap">
                    <div className="px-mosaic-track">
                        <div className="px-mosaic-card bg-white border border-slate-200 text-slate-900">
                            <div className="px-mosaic-icon"><i className="fas fa-shopping-bag"></i></div>
                            <h4 className="text-slate-900">E-Commerce &amp; Retail</h4>
                            <p className="text-slate-600">High-performance storefronts, custom marketplaces, inventory automation and vendor splits.</p>
                            <span className="px-mosaic-link text-[#2F49C8]">Explore <i className="fas fa-arrow-right"></i></span>
                        </div>
                        <div className="px-mosaic-card bg-[#2F49C8] border-transparent text-white">
                            <div className="px-mosaic-icon"><i className="fas fa-coins"></i></div>
                            <h4 className="text-white">FinTech &amp; Banking</h4>
                            <p className="text-slate-200">Compliance-ready transaction gates, automated ledgers, payouts API and loan portfolios.</p>
                            <span className="px-mosaic-link text-indigo-100">Explore <i className="fas fa-arrow-right"></i></span>
                        </div>
                        <div className="px-mosaic-card bg-white border border-slate-200 text-slate-900">
                            <div className="px-mosaic-icon"><i className="fas fa-truck"></i></div>
                            <h4 className="text-slate-900">Logistics &amp; Supply Chain</h4>
                            <p className="text-slate-600">End-to-end transport tracking, dynamic routing algorithms, and driver dispatch software.</p>
                            <span className="px-mosaic-link text-[#2F49C8]">Explore <i className="fas fa-arrow-right"></i></span>
                        </div>
                        <div className="px-mosaic-card bg-white border border-slate-200 text-slate-900">
                            <div className="px-mosaic-icon"><i className="fas fa-hospital-user"></i></div>
                            <h4 className="text-slate-900">Healthcare &amp; MedTech</h4>
                            <p className="text-slate-600">Secure hospital management portals, patient charts, and pharmacy inventory APIs.</p>
                            <span className="px-mosaic-link text-[#2F49C8]">Explore <i className="fas fa-arrow-right"></i></span>
                        </div>
                        <div className="px-mosaic-card bg-white border border-slate-200 text-slate-900">
                            <div className="px-mosaic-icon"><i className="fas fa-graduation-cap"></i></div>
                            <h4 className="text-slate-900">EdTech &amp; Education</h4>
                            <p className="text-slate-600">Custom LMS systems, virtual classrooms, fee collection dashboards, and student profiles.</p>
                            <span className="px-mosaic-link text-[#2F49C8]">Explore <i className="fas fa-arrow-right"></i></span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CLIENT VOICES (TESTIMONIAL CAROUSEL) ── */}
            <section className="px-section px-section-tight px-dark px-mesh bg-slate-900">
                <div className="container">
                    <div className="px-test-header">
                        <div className="px-sh px-sh-left">
                            <div className="px-eyebrow text-amber-500 bg-amber-500/10 border border-amber-500/20"><i className="fas fa-quote-left mr-1.5"></i> CLIENT VOICES</div>
                            <h2 className="px-h2 px-display text-white">Trusted By Teams Who've Scaled With Us</h2>
                        </div>
                        <div className="px-test-nav">
                            <button type="button" className="px-test-arrow" onClick={handlePrevTestimonial} aria-label="Previous"><i className="fas fa-arrow-left"></i></button>
                            <button type="button" className="px-test-arrow" onClick={handleNextTestimonial} aria-label="Next"><i className="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <div className="px-test-carousel" ref={carouselRef}>
                        {testimonials.map((t, idx) => (
                            <div key={idx} className="px-test-card">
                                <div className="px-test-card-top">
                                    <div className="px-test-stars">
                                        <i className="fas fa-star" style={{ color: '#d4af37' }}></i>
                                        <i className="fas fa-star" style={{ color: '#d4af37' }}></i>
                                        <i className="fas fa-star" style={{ color: '#d4af37' }}></i>
                                        <i className="fas fa-star" style={{ color: '#d4af37' }}></i>
                                        <i className="fas fa-star" style={{ color: '#d4af37' }}></i>
                                    </div>
                                    <i className="fas fa-quote-right px-test-quote-mark" style={{ color: 'rgba(255,255,255,0.05)' }}></i>
                                </div>
                                <p className="px-test-text">{t.text}</p>
                                <div className="px-test-author">
                                    <div className="px-test-avatar-initials" style={{ background: t.color }}>
                                        {t.initials}
                                    </div>
                                    <div>
                                        <strong>{t.author}</strong>
                                        <span>{t.role}</span>
                                    </div>
                                    <i className="fas fa-check-circle px-test-verified" style={{ color: '#2F49C8' }} title="Verified client"></i>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-testimonial-dots" id="px-test-dots">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                className={`px-testimonial-dot ${i === activeTestimonial ? 'is-active' : ''}`}
                                onClick={() => scrollToTestimonial(i)}
                                style={{ backgroundColor: i === activeTestimonial ? '#f59e0b' : 'rgba(255,255,255,0.2)' }}
                                aria-label={`Testimonial ${i + 1}`}
                            ></button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TRUST & CERTIFICATIONS ── */}
            <section className="px-section-tight bg-white text-slate-900 border-t border-slate-100">
                <div className="container">
                    <div className="px-trust-row grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="px-trust-card bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
                            <div className="px-trust-icon text-amber-500 text-2xl"><i className="fas fa-handshake"></i></div>
                            <span className="font-semibold text-slate-800 text-sm">Client-First Delivery Process</span>
                        </div>
                        <div className="px-trust-card bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
                            <div className="px-trust-icon text-amber-500 text-2xl"><i className="fas fa-user-shield"></i></div>
                            <span className="font-semibold text-slate-800 text-sm">Security Built Into Every Sprint</span>
                        </div>
                        <div className="px-trust-card bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
                            <div className="px-trust-icon text-amber-500 text-2xl"><i className="fas fa-sync-alt"></i></div>
                            <span className="font-semibold text-slate-800 text-sm">Repeat &amp; Referral Clients</span>
                        </div>
                        <div className="px-trust-card bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
                            <div className="px-trust-icon text-amber-500 text-2xl"><i className="fas fa-globe-americas"></i></div>
                            <span className="font-semibold text-slate-800 text-sm">Multi-Country Delivery Since 2011</span>
                        </div>
                    </div>

                    <div className="px-cert-strip border-t border-slate-100 mt-12 pt-8 flex flex-col items-center">
                        <div className="px-eyebrow text-amber-500 bg-amber-500/10 border border-amber-500/20 mb-6"><i className="fas fa-check-double mr-1.5"></i> CERTIFIED &amp; COMPLIANT</div>
                        <div className="px-cert-badges flex flex-wrap justify-center gap-8">
                            <div className="px-cert-badge bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 max-w-[280px]">
                                <div className="px-cert-icon text-amber-500 text-3xl"><i className="fas fa-award"></i></div>
                                <div className="px-cert-info text-left">
                                    <strong className="block text-slate-900 font-bold text-[15px]">CMMI Level 5</strong>
                                    <span className="text-slate-500 text-xs">Process Maturity Appraisal</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            {/* ── INSIGHTS (BLOG SECTION) ── */}
            <section className="px-section bg-white text-slate-900 border-t border-slate-100">
                <div className="container">
                    <div className="px-sh px-sh-center">
                        <div className="px-eyebrow text-amber-500 bg-amber-500/10 border border-amber-500/20"><i className="fas fa-newspaper mr-1.5"></i> INSIGHTS</div>
                        <h2 className="px-h2 px-display text-slate-900">From the Engineering Desk</h2>
                    </div>
                    <div className="px-blog-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                        <Link to="/docs" className="px-blog-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-blog-card-header bg-gradient-to-br from-indigo-500 to-blue-600 relative h-40 flex items-center justify-center">
                                <i className="fas fa-bullhorn text-white text-4xl opacity-80"></i>
                                <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider">Company News</span>
                            </div>
                            <div className="px-blog-card-body p-6 text-left">
                                <div className="px-blog-card-meta text-slate-500 text-xs flex items-center gap-4 mb-3">
                                    <span><i className="far fa-calendar mr-1"></i> 04 Jul, 2026</span>
                                    <span><i className="far fa-clock mr-1"></i> 2 min read</span>
                                </div>
                                <h4 className="text-slate-900 font-bold text-[17px] leading-snug mb-3">How to Choose the Right Software Development Company in India in 2026</h4>
                                <p className="text-slate-600 text-sm leading-relaxed mb-4">With thousands of software development companies operating across India, choosing the right technology partner...</p>
                                <span className="px-blog-card-link text-amber-600 font-semibold hover:text-amber-700 flex items-center gap-1.5 text-sm">Read Article <i className="fas fa-arrow-right text-xs"></i></span>
                            </div>
                        </Link>
                        <Link to="/docs" className="px-blog-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-blog-card-header bg-gradient-to-br from-indigo-500 to-blue-600 relative h-40 flex items-center justify-center">
                                <i className="fas fa-bullhorn text-white text-4xl opacity-80"></i>
                                <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider">Company News</span>
                            </div>
                            <div className="px-blog-card-body p-6 text-left">
                                <div className="px-blog-card-meta text-slate-500 text-xs flex items-center gap-4 mb-3">
                                    <span><i className="far fa-calendar mr-1"></i> 04 Jul, 2026</span>
                                    <span><i className="far fa-clock mr-1"></i> 2 min read</span>
                                </div>
                                <h4 className="text-slate-900 font-bold text-[17px] leading-snug mb-3">BluePay Expands to Bangalore, Uttar Pradesh and the UAE - Strengthening Our Pan-India and Global Presence</h4>
                                <p className="text-slate-600 text-sm leading-relaxed mb-4">BluePay is expanding its footprint with new offices in Bengaluru (Karnataka), Ghaziabad (Uttar Pradesh), an...</p>
                                <span className="px-blog-card-link text-amber-600 font-semibold hover:text-amber-700 flex items-center gap-1.5 text-sm">Read Article <i className="fas fa-arrow-right text-xs"></i></span>
                            </div>
                        </Link>
                        <Link to="/docs" className="px-blog-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-blog-card-header bg-gradient-to-br from-orange-500 to-amber-600 relative h-40 flex items-center justify-center">
                                <i className="fas fa-chart-line text-white text-4xl opacity-80"></i>
                                <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider">FinTech</span>
                            </div>
                            <div className="px-blog-card-body p-6 text-left">
                                <div className="px-blog-card-meta text-slate-500 text-xs flex items-center gap-4 mb-3">
                                    <span><i className="far fa-calendar mr-1"></i> 25 May, 2026</span>
                                    <span><i className="far fa-clock mr-1"></i> 6 min read</span>
                                </div>
                                <h4 className="text-slate-900 font-bold text-[17px] leading-snug mb-3">Best White Label UPI Payment Gateway Solution in India 2026 - Secure &amp; Scalable Fintech Platform</h4>
                                <p className="text-slate-600 text-sm leading-relaxed mb-4">India is leading the global digital payment revolution, and UPI transactions are expected to cross record-brea...</p>
                                <span className="px-blog-card-link text-amber-600 font-semibold hover:text-amber-700 flex items-center gap-1.5 text-sm">Read Article <i className="fas fa-arrow-right text-xs"></i></span>
                            </div>
                        </Link>
                    </div>
                    <div className="flex justify-center mt-12">
                        <Link to="/docs" className="px-btn bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-2">
                            All Articles
                            <i className="fas fa-arrow-right text-xs"></i>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── LET'S PARTNER (CTA PANEL) ── */}
            <section className="px-section px-section-tight bg-white text-slate-900">
                <div className="container">
                    <div className="px-cta-panel px-mesh">
                        <div className="px-eyebrow text-amber-500 bg-amber-500/10 border border-amber-500/20 mx-auto">LET'S BUILD</div>
                        <h2 className="px-h2 px-display text-white">Have a platform to build or scale?</h2>
                        <p className="px-lead mx-auto text-slate-200">Tell us about your goal &mdash; we'll respond with a practical scope, timeline, and team structure within one business day.</p>

                        <div className="px-hero-cta-row flex justify-center gap-4 mt-8">
                            <Link to="/contact" className="px-btn bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-2">
                                Book a Meeting
                                <i className="fas fa-calendar"></i>
                            </Link>
                            <Link to="/contact" className="px-btn border border-white/20 hover:border-white/40 text-white font-semibold flex items-center gap-2">
                                Start a Conversation
                                <i className="fas fa-arrow-right"></i>
                            </Link>
                        </div>

                        <div className="px-cta-direct-row text-slate-400 text-sm mt-8 flex flex-wrap justify-center items-center gap-4">
                            <a href="tel:+919216034016" className="hover:text-white flex items-center gap-1.5"><i className="fas fa-phone text-amber-500"></i> +91 9216034016 <span className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">India</span></a>
                            <span className="text-slate-600">&bull;</span>
                            <a href="mailto:contact@bluepay.in" className="hover:text-white flex items-center gap-1.5"><i className="fas fa-envelope text-amber-500"></i> contact@bluepay.in</a>
                            <span className="text-slate-600">&bull;</span>
                            <a href="https://wa.me/919216034016" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1.5"><i className="fab fa-whatsapp text-amber-500"></i> WhatsApp</a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
