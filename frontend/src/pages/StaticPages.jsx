import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

// Common Breadcrumb Hero Component
const InnerHero = ({ badge, title, desc, activePage }) => (
    <section className="pp-hero">
        <div className="container">
            {badge && <span className="pp-hero-badge"><i className="fas fa-code-branch" style={{ marginRight: '6px' }}></i> {badge}</span>}
            <h1>{title}</h1>
            {desc && <p className="pp-hero-desc">{desc}</p>}
            <ul className="pp-breadcrumb">
                <li><Link to="/">Home</Link></li>
                <li className="active"><a href="#">{activePage}</a></li>
            </ul>
        </div>
    </section>
);

// ── 1. ABOUT US PAGE ──
export const About = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
            <div style={{ height: '114px' }}></div>
            <Navbar />
            <InnerHero 
                badge="ABOUT BLUEPAY" 
                title="Pioneering Custom Software Engineering" 
                desc="DPIIT recognized software platform developer offering premium web/mobile design, AI integration, and robust FinTech architecture." 
                activePage="About Us"
            />
            
            <section className="pp-section bg-slate-900/50">
                <div className="container">
                    <div className="pp-about-grid">
                        <div className="pp-about-img-wrap" style={{ border: '1px solid rgba(255,255,255,0.05)', padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', color: '#fff' }}>DPIIT Startup India</h3>
                            <p style={{ color: '#94a3b8', lineHeight: '1.7', marginBottom: '20px' }}>
                                BluePay is proud to be recognized by the Department for Promotion of Industry and Internal Trade (DPIIT), Government of India, as an innovative player driving the digital software engineering ecosystem.
                            </p>
                            <div className="flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                                <span className="text-xs text-blue-500 font-bold" style={{ borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '15px' }}>#startupindia</span>
                                <span style={{ fontSize: '13px', color: '#94a3b8' }}>DPIIT Recognition Number: DIPP143224</span>
                            </div>
                        </div>

                        <div className="pp-about-info">
                            <span className="pp-section-label">Our Mission</span>
                            <h3 style={{ color: '#fff' }}>Empowering Tomorrow's Enterprises with Clean Code</h3>
                            <p>
                                Launch your product smoothly with our dedicated engineering squads, cloud hosting solutions, and multi-tenant SaaS structures. We design platforms that are scalable, maintainable, and built around your specific operational workflows from day one.
                            </p>
                            <p>
                                Our client-first model ensures absolute transparency on milestones, repository commits, and project architecture. We offer 0% software licensing fees for early-stage registered startups to support bootstrapping founders.
                            </p>
                            <ul className="pp-about-checks">
                                <li><i><i className="fas fa-check"></i></i> Dedicated Engineering Squads</li>
                                <li><i><i className="fas fa-check"></i></i> Clean Architecture, Clean Code</li>
                                <li><i><i className="fas fa-check"></i></i> Continuous Integration &amp; QA</li>
                                <li><i><i className="fas fa-check"></i></i> 24/7 Developer Consultation</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pp-section bg-slate-950">
                <div className="container">
                    <div className="pp-stats">
                        <div className="pp-stat-card">
                            <div className="pp-stat-num">18+</div>
                            <div className="pp-stat-label">Years of Collective Experience</div>
                        </div>
                        <div className="pp-stat-card">
                            <div className="pp-stat-num">1</div>
                            <div className="pp-stat-label">Corporate Office</div>
                        </div>
                        <div className="pp-stat-card">
                            <div className="pp-stat-num">700+</div>
                            <div className="pp-stat-label">Production Systems Deployed</div>
                        </div>
                        <div className="pp-stat-card">
                            <div className="pp-stat-num">1500+</div>
                            <div className="pp-stat-label">GitHub Repositories Created</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pp-section bg-slate-900/50">
                <div className="container">
                    <div className="px-sh px-sh-center">
                        <span className="pp-section-label">Our Core Values</span>
                        <h2 className="pp-section-title" style={{ color: '#fff' }}>Values that Drive Our Architecture</h2>
                    </div>
                    <div className="pp-values-grid">
                        <div className="pp-value-card" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                            <div className="pp-value-icon" style={{ color: '#2F49C8' }}><i className="fas fa-shield-halved"></i></div>
                            <h4 style={{ color: '#fff' }}>Security &amp; Hardening</h4>
                            <p style={{ color: '#94a3b8' }}>Every codebase we deploy undergoes rigorous penetration testing, dependency scanning, and isolation gates to ensure complete asset protection.</p>
                        </div>
                        <div className="pp-value-card" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                            <div className="pp-value-icon" style={{ color: '#2F49C8' }}><i className="fas fa-eye"></i></div>
                            <h4 style={{ color: '#fff' }}>Absolute Transparency</h4>
                            <p style={{ color: '#94a3b8' }}>Zero hidden maintenance charges, instant milestone updates, and live repository commits displayed clearly on your client portal.</p>
                        </div>
                        <div className="pp-value-card" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                            <div className="pp-value-icon" style={{ color: '#2F49C8' }}><i className="fas fa-rocket"></i></div>
                            <h4 style={{ color: '#fff' }}>Scale Ready</h4>
                            <p style={{ color: '#94a3b8' }}>Engineered with containerized microservices and dynamically scalable cloud nodes to easily manage peak season user traffic spikes.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pp-section bg-slate-950">
                <div className="container">
                    <div className="px-sh px-sh-center">
                        <span className="pp-section-label">Engineering Process</span>
                        <h2 className="pp-section-title" style={{ color: '#fff' }}>Our Product Delivery Lifecycle</h2>
                    </div>
                    <div className="pp-process">
                        <div className="pp-process-step">
                            <h4 style={{ color: '#fff' }}>1. Product Discovery</h4>
                            <p style={{ color: '#94a3b8' }}>Define scoping documents, user journeys, database schemas, and interface mockups before writing code.</p>
                        </div>
                        <div className="pp-process-step">
                            <h4 style={{ color: '#fff' }}>2. Clean Architecture</h4>
                            <p style={{ color: '#94a3b8' }}>Structure backends using SOLID design principles, clean entity boundaries, and environment isolation.</p>
                        </div>
                        <div className="pp-process-step">
                            <h4 style={{ color: '#fff' }}>3. Agile Engineering</h4>
                            <p style={{ color: '#94a3b8' }}>Deliver features in 2-week sprints with automated builds, container packaging, and secure coding audits.</p>
                        </div>
                        <div className="pp-process-step">
                            <h4 style={{ color: '#fff' }}>4. Rigorous QA</h4>
                            <p style={{ color: '#94a3b8' }}>Run integration test scripts, stress checks, visual regression reviews, and seamless production deployments.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pp-section bg-slate-900/50">
                <div className="container">
                    <div className="pp-cta-banner">
                        <h2 style={{ color: '#fff' }}>Ready to build your next-gen software platform?</h2>
                        <p style={{ color: 'rgba(255,255,255,0.85)' }}>Get in touch today to receive a customized scoping proposal and team layout.</p>
                        <Link to="/contact" className="pp-cta-btn" style={{ color: '#2F49C8' }}>Start a Conversation <i className="fas fa-arrow-right" style={{ marginLeft: '6px' }}></i></Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

// ── 2. ONBOARDING DOCUMENTATION PAGE ──
export const Docs = () => {
    const steps = [
        {
            title: '1. Scoping & Architecture Setup',
            items: [
                'ALIGNMENT: Align on interface mockups, user stories, and target database schemas.',
                'ENVIRONMENT: Define production and staging parameters on AWS, Azure, or GCP.',
                'REPOSITORIES: Establish clean repository isolation layers in GitLab or GitHub.'
            ]
        },
        {
            title: '2. Dedicated Development Sprints',
            items: [
                'SPRINTS: Work in scheduled 2-week iterations with visible project tracker tickets.',
                'COMMITS: Commit daily, maintaining clean architecture patterns and documented class structures.',
                'REVIEWS: Conduct peer code reviews and static scanning audits to avoid technical debt.'
            ]
        },
        {
            title: '3. QA Automation & Integration',
            items: [
                'TESTING: Run unit test scripts and visual testing grids across standard viewport widths.',
                'CI/CD: Build pipelines that package codebases into container images automatically.',
                'STAGING: Push builds to cloud staging environments for stakeholder visual approval.'
            ]
        },
        {
            title: '4. Production Release & Handover',
            items: [
                'DEPLOYMENT: Coordinate surgical production releases with zero system downtime.',
                'HANDOVER: Provide complete technical documentation, database schemas, and API references.',
                'MAINTENANCE: Transition to long-term monitoring, alert sweeps, and patch maintenance.'
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
            <div style={{ height: '114px' }}></div>
            <Navbar />
            <InnerHero 
                badge="DOCUMENTATION" 
                title="Client Scoping & Scrutiny Guide" 
                desc="Step-by-step development process, repository patterns, and code delivery guidelines." 
                activePage="Documentation"
            />

            <section className="pp-section bg-slate-900/50">
                <div className="container">
                    <div className="max-w-4xl mx-auto space-y-12">
                        {steps.map((step, idx) => (
                            <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '30px', borderRadius: '16px' }}>
                                <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2F49C8', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '14px' }}>{idx + 1}</span>
                                    {step.title}
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-3">
                                    {step.items.map((item, i) => (
                                        <li key={i} style={{ display: 'flex', gap: '10px', color: '#94a3b8', fontSize: '15px', lineHeight: '1.6' }}>
                                            <i className="fas fa-check" style={{ color: '#2F49C8', marginTop: '4px' }}></i>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

// ── 3. PROJECT STATUS TRACKER PAGE ──
export const TrackStatus = () => {
    const [searchId, setSearchId] = useState('');
    const [searching, setSearching] = useState(false);
    const [result, setResult] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchId) return;
        setSearching(true);
        setResult(null);

        // Simulate project milestone tracking
        setTimeout(() => {
            setSearching(false);
            setResult({
                id: searchId,
                status: 'IN PROGRESS',
                sprint: 'Sprint 4 (Dashboard Integration)',
                completion: '72%',
                leadDeveloper: 'Amit Sharma (Team Lead)',
                lastCommit: '2026-07-22 09:12 AM IST',
                notes: 'Frontend bento grid adjustments and API failover route integration.'
            });
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
            <div style={{ height: '114px' }}></div>
            <Navbar />
            <InnerHero 
                badge="CLIENT TOOLS" 
                title="Track Project Status" 
                desc="Verify sprint progress, milestone completion rates, and last repository commit keys." 
                activePage="Track Status"
            />

            <section className="pp-section bg-slate-900/50">
                <div className="container">
                    <div className="max-w-2xl mx-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '40px', borderRadius: '16px' }}>
                        <form onSubmit={handleSearch}>
                            <div className="mb-6">
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                                    Project Scoping Key / Proposal Reference ID
                                </label>
                                <input 
                                    type="text" 
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    placeholder="Enter your proposal reference key (e.g. BP_PROPOSAL_2026_89)"
                                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="px-btn px-btn-primary" 
                                style={{ width: '100%', display: 'block', border: 'none' }}
                                disabled={searching}
                            >
                                {searching ? 'Querying project logs...' : 'Lookup Project Status'}
                            </button>
                        </form>

                        {/* Search Result */}
                        {result && (
                            <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '30px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 }}>Milestone Tracking</h4>
                                    <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700' }}>
                                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> {result.status}
                                    </span>
                                </div>
                                <div className="space-y-3" style={{ fontSize: '14px', color: '#94a3b8' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Proposal ID:</span>
                                        <strong style={{ color: '#fff' }}>{result.id}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Current Sprint:</span>
                                        <strong style={{ color: '#fff' }}>{result.sprint}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Scoping Completion:</span>
                                        <strong style={{ color: '#fff' }}>{result.completion}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Lead Architect:</span>
                                        <strong style={{ color: '#fff' }}>{result.leadDeveloper}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Last Repository Commit:</span>
                                        <strong style={{ color: '#fff' }}>{result.lastCommit}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'column', gap: '4px' }}>
                                        <span>Sprint Target Details:</span>
                                        <strong style={{ color: '#fff', fontWeight: '500' }}>{result.notes}</strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

// ── 4. REFUND & RETURN POLICY PAGE ──
export const Refund = () => (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
        <div style={{ height: '114px' }}></div>
        <Navbar />
        <InnerHero 
            badge="LEGAL INFORMATION" 
            title="Refund &amp; Project Cancellation Policy" 
            desc="Rules governing milestone project cancellations, consultations deposits, and service refunds." 
            activePage="Refund Policy"
        />

        <section className="pp-section bg-slate-900/50">
            <div className="container">
                <div className="max-w-4xl mx-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '40px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(47,73,200,0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2F49C8', marginBottom: '30px' }}>
                        <i className="fas fa-info-circle" style={{ color: '#2F49C8' }}></i>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>Last Updated: January 1, 2026</span>
                    </div>

                    <div className="space-y-8" style={{ color: '#94a3b8', lineHeight: '1.8' }}>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>1. Project Cancellation Framework</h3>
                            <p>
                                At BluePay, we deliver engineering services on a milestone-based system. If a client chooses to terminate a project, work completed during the active milestone sprint is billed fully and is non-refundable. Subsequent unstarted milestones will not be charged.
                            </p>
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>2. Deposit Refunds</h3>
                            <ul style={{ listStyle: 'disc inside' }} className="space-y-2 pl-2">
                                <li><strong>Pre-Engineering Stage:</strong> Deposits are refundable at 80% if cancelled before scoping documents are initialized.</li>
                                <li><strong>Active Development Stage:</strong> Initial deposits are non-refundable once environment provision, code repositories, or UI mockups are completed.</li>
                                <li><strong>Cloud Server Hosting:</strong> Retainers for VPS, cloud infrastructure hosting, or server monitoring are billed monthly and can be cancelled at any billing cycle.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>3. Service Level disputes</h3>
                            <p>
                                In the event that custom software does not meet the criteria specified in the verified proposal scoping document, a review panel will evaluate code branches to coordinate adjustments or issue partial credits.
                            </p>
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>4. Contact Support</h3>
                            <p>
                                For project cancel reviews or account billing disputes, contact contact@bluepay.in or call +91-9216034016. Office coordinates: Trimurty Prime Tower, Niwaru Road, Jhotwara, Jaipur, 302012 Rajasthan.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
);

// ── 5. PRIVACY POLICY PAGE ──
export const Privacy = () => (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
        <div style={{ height: '114px' }}></div>
        <Navbar />
        <InnerHero 
            badge="LEGAL INFORMATION" 
            title="Privacy Policy" 
            desc="How BluePay stores, collects, and secures user data, client repositories and code assets." 
            activePage="Privacy Policy"
        />

        <section className="pp-section bg-slate-900/50">
            <div className="container">
                <div className="max-w-4xl mx-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '40px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(47,73,200,0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2F49C8', marginBottom: '30px' }}>
                        <i className="fas fa-lock" style={{ color: '#2F49C8' }}></i>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>Last Updated: January 1, 2026</span>
                    </div>

                    <div className="space-y-8" style={{ color: '#94a3b8', lineHeight: '1.8' }}>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>1. Repository & Code Security</h3>
                            <p>
                                All client codebases, intellectual property blueprints, API credentials, and database schemas are stored in isolated virtual private servers. We implement access tokens, network isolation, and encryption to ensure client assets are never exposed.
                            </p>
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>2. Information We Collect</h3>
                            <ul style={{ listStyle: 'disc inside' }} className="space-y-2 pl-2">
                                <li><strong>Client Profile:</strong> Contact credentials, billing coordinates, and proposal references.</li>
                                <li><strong>Project Data:</strong> Technical logs, cloud infrastructure configurations, and visual mockups.</li>
                                <li><strong>Developer Audits:</strong> Commit hashes, author emails, and pipeline compile logs.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>3. Data Hardening</h3>
                            <p>
                                We utilize secure SSL connections and AES-256 database fields. Access to client repositories is restricted via dual-factor developer authentication keys.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
);

// ── 6. TERMS & CONDITIONS PAGE ──
export const Terms = () => (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
        <div style={{ height: '114px' }}></div>
        <Navbar />
        <InnerHero 
            badge="LEGAL INFORMATION" 
            title="Terms of Service" 
            desc="Client engineering guidelines, code ownership rules, and service level conditions." 
            activePage="Terms &amp; Conditions"
        />

        <section className="pp-section bg-slate-900/50">
            <div className="container">
                <div className="max-w-4xl mx-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '40px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(47,73,200,0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2F49C8', marginBottom: '30px' }}>
                        <i className="fas fa-file-contract" style={{ color: '#2F49C8' }}></i>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>Last Updated: January 1, 2026</span>
                    </div>

                    <div className="space-y-8" style={{ color: '#94a3b8', lineHeight: '1.8' }}>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>1. Project Activation</h3>
                            <p>
                                Custom software development milestones and squad allocations will only be initialized after signing the master service agreement (MSA) and clearing the corresponding milestone retainer.
                            </p>
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>2. Code Ownership &amp; IP</h3>
                            <p>
                                Upon final payment settlement of each project phase, full copyright and intellectual property rights for the custom source code branch are transferred to the client. Third-party packages, default libraries, and proprietary BluePay modules remain licensed under standard terms.
                            </p>
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>3. Service Level Agreements</h3>
                            <p>
                                Project deliverables and delivery schedules are estimated based on technical scoping. Delays due to third-party integration constraints, API access blocks, or design changes will be logged under standard scoping adjustments.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
);

// ── 7. CONTACT US PAGE ──
export const Contact = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/support/contact', {
                name,
                email,
                message: msg
            });
            setSubmitted(true);
            setName('');
            setEmail('');
            setMsg('');
        } catch (err) {
            setError(err.response?.data?.msg || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
            <div style={{ height: '114px' }}></div>
            <Navbar />
            <InnerHero 
                badge="CONTACT SUPPORT" 
                title="Start a Conversation" 
                desc="Have questions about custom software, pricing quotes, or team allocation sizes? We're available." 
                activePage="Contact Us"
            />

            <section className="pp-section bg-slate-900/50">
                <div className="container">
                    <div className="row flex flex-wrap" style={{ display: 'flex', gap: '30px' }}>
                        
                        {/* Contact details */}
                        <div className="col-lg-5" style={{ flex: '1 0 350px' }}>
                            <span className="pp-section-label">Contact Coordinates</span>
                            <h2 className="pp-section-title" style={{ color: '#fff', marginBottom: '24px' }}>Let's talk details</h2>
                            
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: 'rgba(47,73,200,0.15)', border: '1px solid rgba(47,73,200,0.3)', color: '#2F49C8' }}>
                                        <i className="fas fa-phone"></i>
                                    </div>
                                    <div>
                                        <strong style={{ display: 'block', color: '#fff', fontSize: '15px' }}>Phone Number</strong>
                                        <a href="tel:+919216034016" style={{ color: '#94a3b8', fontSize: '14px', textDecoration: 'none' }}>+91-9216034016</a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: 'rgba(47,73,200,0.15)', border: '1px solid rgba(47,73,200,0.3)', color: '#2F49C8' }}>
                                        <i className="fas fa-envelope"></i>
                                    </div>
                                    <div>
                                        <strong style={{ display: 'block', color: '#fff', fontSize: '15px' }}>Email Address</strong>
                                        <a href="mailto:contact@bluepay.in" style={{ color: '#94a3b8', fontSize: '14px', textDecoration: 'none' }}>contact@bluepay.in</a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: 'rgba(47,73,200,0.15)', border: '1px solid rgba(47,73,200,0.3)', color: '#2F49C8' }}>
                                        <i className="fas fa-map-marker-alt"></i>
                                    </div>
                                    <div>
                                        <strong style={{ display: 'block', color: '#fff', fontSize: '15px' }}>Office Studio Address</strong>
                                        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                                            Trimurty Prime Tower, Niwaru Road, Jhotwara, Jaipur, 302012 Rajasthan
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Message Form */}
                        <div className="col-lg-6" style={{ flex: '1.2 0 350px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '30px', borderRadius: '16px' }}>
                            {submitted ? (
                                <div className="text-center py-12">
                                    <i className="fas fa-circle-check" style={{ color: '#22c55e', fontSize: '48px', marginBottom: '16px' }}></i>
                                    <h4 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Thank you for reaching out!</h4>
                                    <p style={{ color: '#94a3b8' }}>Our engineering consulting team will contact you within one business hour.</p>
                                    <button onClick={() => setSubmitted(false)} className="px-btn px-btn-glass mt-4" style={{ border: 'none' }}>Send another message</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    {error && <div className="mb-4 text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">{error}</div>}
                                    <div className="mb-4">
                                        <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '6px' }}>Full Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '6px' }}>Email Address</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '6px' }}>Message Details</label>
                                        <textarea 
                                            rows="4"
                                            required
                                            value={msg}
                                            onChange={(e) => setMsg(e.target.value)}
                                            placeholder="Tell us about your product concept, required stack, or timeline details..."
                                            style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none', resize: 'none' }}
                                        ></textarea>
                                    </div>
                                    <button type="submit" disabled={loading} className="px-btn px-btn-primary" style={{ width: '100%', border: 'none' }}>
                                        {loading ? 'Submitting Request...' : 'Submit Scoping Request'}
                                    </button>
                                </form>
                            )}
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
};

// ── 8. APPLY ONBOARDING PAGE ──
export const Apply = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/support/contact', {
                name,
                email,
                message: msg
            });
            setSubmitted(true);
            setName('');
            setEmail('');
            setMsg('');
        } catch (err) {
            setError(err.response?.data?.msg || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
            <div style={{ height: '114px' }}></div>
            <Navbar />
            <InnerHero 
                badge="MERCHANT ONBOARDING" 
                title="Apply for BluePay Onboarding" 
                desc="Submit your merchant application query. Our compliance team will review your application within one business day." 
                activePage="Apply Now"
            />

            <section className="pp-section bg-slate-900/50">
                <div className="container">
                    <div className="row flex flex-wrap justify-center" style={{ display: 'flex', justifyContent: 'center' }}>
                        
                        {/* Message Form */}
                        <div className="col-lg-8" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '40px', borderRadius: '16px' }}>
                            {submitted ? (
                                <div className="text-center py-12">
                                    <i className="fas fa-circle-check" style={{ color: '#22c55e', fontSize: '48px', marginBottom: '16px' }}></i>
                                    <h4 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Application Query Submitted!</h4>
                                    <p style={{ color: '#94a3b8' }}>Our compliance assessment squad has registered your application. We will contact you at your email shortly.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    {error && <div className="mb-4 text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded">{error}</div>}
                                    <div className="mb-4">
                                        <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '6px' }}>Business / Full Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '6px' }}>Email Address</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label style={{ display: 'block', fontSize: '14px', color: '#cbd5e1', marginBottom: '6px' }}>Business Query / Onboarding Details</label>
                                        <textarea 
                                            rows="5"
                                            required
                                            value={msg}
                                            onChange={(e) => setMsg(e.target.value)}
                                            placeholder="Please describe your business model, estimated transaction volumes, and target integrations..."
                                            style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none', resize: 'none' }}
                                        ></textarea>
                                    </div>
                                    <button type="submit" disabled={loading} className="px-btn bg-[#2F49C8] hover:bg-[#1D35B3] text-white" style={{ width: '100%', border: 'none' }}>
                                        {loading ? 'Submitting Request...' : 'Submit Onboarding Application'}
                                    </button>
                                </form>
                            )}
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
};
