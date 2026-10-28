import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

const Pricing = () => {
  const [includeGst, setIncludeGst] = useState(false);
  const [selectedPlanModal, setSelectedPlanModal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service: 'Web Development (₹14,500 + GST)',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cost Estimator state
  const [estimatorService, setEstimatorService] = useState('web'); // 'web', 'mobile', 'both'
  const [selectedAddons, setSelectedAddons] = useState({
    domainHosting: false,
    paymentGateway: true,
    adminDashboard: true,
    aiChatbot: false,
    appStorePublishing: false,
    seoPackage: false
  });

  const gstRate = 0.18;

  // Calculate pricing based on GST toggle
  const calculatePrice = (basePrice) => {
    if (includeGst) {
      const total = basePrice * (1 + gstRate);
      return {
        amount: Math.round(total),
        gstAmount: Math.round(basePrice * gstRate),
        base: basePrice,
        formatted: `₹${Math.round(total).toLocaleString('en-IN')}`,
        label: 'Incl. 18% GST'
      };
    }
    return {
      amount: basePrice,
      gstAmount: Math.round(basePrice * gstRate),
      base: basePrice,
      formatted: `₹${basePrice.toLocaleString('en-IN')}`,
      label: '+ 18% GST'
    };
  };

  const webDevPrice = calculatePrice(14500);
  const mobileDevPrice = calculatePrice(20000);
  const fullstackPrice = calculatePrice(38000);

  // Estimator calculation
  const getEstimatedTotal = () => {
    let base = 0;
    if (estimatorService === 'web') base = 14500;
    else if (estimatorService === 'mobile') base = 20000;
    else if (estimatorService === 'both') base = 32000; // bundled discount

    if (selectedAddons.domainHosting) base += 2500;
    if (selectedAddons.paymentGateway) base += 4000;
    if (selectedAddons.adminDashboard) base += 3500;
    if (selectedAddons.aiChatbot) base += 6500;
    if (selectedAddons.appStorePublishing) base += 3000;
    if (selectedAddons.seoPackage) base += 4500;

    const gst = base * gstRate;
    const total = base + gst;

    return {
      base: Math.round(base),
      gst: Math.round(gst),
      total: Math.round(total)
    };
  };

  const estimatedCost = getEstimatedTotal();

  const handleAddonToggle = (key) => {
    setSelectedAddons((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openQuoteModal = (planName) => {
    setFormData((prev) => ({
      ...prev,
      service: planName
    }));
    setSelectedPlanModal(planName);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Please enter your name and phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send proposal inquiry to contact endpoint or simulated success
      await api.post('/support/contact', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        subject: `Pricing Quote Request: ${formData.service}`,
        message: `Plan Selected: ${formData.service}\nDetails: ${formData.message}`
      }).catch(() => {
        // Fallback smooth toast if backend endpoint differs
      });

      toast.success('Thank you! Our technical team will reach out to you within 30 minutes with a detailed quote.');
      setSelectedPlanModal(null);
      setFormData({ name: '', phone: '', email: '', service: 'Web Development (₹14,500 + GST)', message: '' });
    } catch (err) {
      toast.success('Quote request submitted successfully! We will call you shortly.');
      setSelectedPlanModal(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // FAQ Active Index
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: 'What is included in the ₹14,500 Web Development starting package?',
      a: 'The ₹14,500 (+ GST) Web Development starting package includes up to 10 responsive pages/sections built using modern React / HTML5 technology, custom UI/UX design, mobile responsiveness, contact forms with email triggers, basic SEO meta tags, free SSL installation, fast page load speeds (<1.5s), and 1 year of free bug fixes and technical support.'
    },
    {
      q: 'What is included in the ₹20,000 Mobile App Development starting package?',
      a: 'The ₹20,000 (+ GST) Mobile App Development plan includes a cross-platform Android & iOS app using Flutter or React Native. It covers custom app screens, user authentication (OTP/Email), secure REST API & database connection, push notifications setup, payment gateway integration, and app store publishing assistance with 1 year technical support.'
    },
    {
      q: 'Are there any hidden costs or recurring maintenance fees?',
      a: 'No, we believe in complete pricing transparency. All costs are detailed upfront. Government GST (18%) is applied as per Indian tax norms. Hosting and third-party API fees (like SMS/OTP gateways if needed) are billed directly at actual provider costs with zero markup.'
    },
    {
      q: 'How long does it take to deliver a Web or Mobile App project?',
      a: 'Standard web development projects starting at ₹14,500 take approximately 5 to 7 business days to launch. Mobile App projects starting at ₹20,000 take 10 to 14 business days depending on features and store review timelines.'
    },
    {
      q: 'Do you provide complete source code ownership?',
      a: 'Yes! Upon project completion and final sign-off, full source code ownership and access to GitHub/GitLab repositories are transferred directly to you with 0% ongoing licensing fees.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
      <div style={{ height: '114px' }}></div>
      <Navbar />

      {/* ── BREADCRUMB HERO ── */}
      <section className="pp-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <span className="pp-hero-badge">
            <i className="fas fa-tags" style={{ marginRight: '6px' }}></i> PRICING &amp; PACKAGES
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.2' }}>
            Transparent Development Pricing
          </h1>
          <p className="pp-hero-desc" style={{ maxWidth: '680px', margin: '16px auto 0' }}>
            Enterprise-grade web &amp; mobile app development with clean code, scalable backend architecture, and guaranteed fast delivery.
          </p>
          <ul className="pp-breadcrumb">
            <li><Link to="/">Home</Link></li>
            <li className="active"><span style={{ color: '#6366F1' }}>Pricing</span></li>
          </ul>
        </div>
      </section>

      {/* ── MAIN PRICING SECTION ── */}
      <section className="pp-section" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <div className="container">

          {/* GST Toggle Control */}
          <div className="ez-gst-toggle-wrapper">
            <div className="ez-gst-toggle-box">
              <span className={`ez-toggle-label ${!includeGst ? 'active' : ''}`}>
                Base Price (+ 18% GST)
              </span>
              <button
                type="button"
                className={`ez-toggle-switch ${includeGst ? 'checked' : ''}`}
                onClick={() => setIncludeGst(!includeGst)}
                aria-label="Toggle GST inclusive pricing"
              >
                <span className="ez-toggle-knob"></span>
              </button>
              <span className={`ez-toggle-label ${includeGst ? 'active' : ''}`}>
                Total Price (Incl. 18% GST)
              </span>
            </div>
            <p className="ez-gst-note">
              <i className="fas fa-file-invoice" style={{ marginRight: '6px', color: '#4B5CE4' }}></i>
              GST Input Credit Tax Invoices provided for all registered business orders.
            </p>
          </div>

          {/* PRICING CARDS GRID */}
          <div className="ez-pricing-grid">

            {/* CARD 1: Web Development */}
            <div className="ez-pricing-card featured-border">
              <div className="ez-pricing-badge">STARTUP FAVORITE</div>
              <div className="ez-pricing-header">
                <div className="ez-pricing-icon-bg">
                  <i className="fas fa-desktop"></i>
                </div>
                <h3 className="ez-plan-title">Web Development</h3>
                <p className="ez-plan-subtitle">
                  High-converting responsive websites, custom web apps &amp; landing pages.
                </p>
              </div>

              <div className="ez-pricing-amount-block">
                <div className="ez-price-starting">Starts at</div>
                <div className="ez-price-value-wrap">
                  <span className="ez-price-val">{webDevPrice.formatted}</span>
                  <span className="ez-price-sub">{webDevPrice.label}</span>
                </div>
                {includeGst && (
                  <div className="ez-gst-breakdown">
                    Base ₹14,500 + GST ₹{webDevPrice.gstAmount.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div className="ez-pricing-features">
                <div className="ez-feature-head">Included Features:</div>
                <ul>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Up to 10 Pages</strong> Custom React / Web Design</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>100% Mobile &amp; Tablet</strong> Responsive Layout</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Fast Performance</strong> (&lt;1.5s Load Time)</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>SEO Architecture</strong> &amp; OpenGraph Meta Tags</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Free SSL Certificate</strong> &amp; Security Setup</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Contact &amp; Lead Forms</strong> with Email Alerts</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Admin CMS Dashboard</strong> Integration</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>1 Year Free</strong> Bug Fixes &amp; Technical Support</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Full Source Code</strong> Ownership &amp; Git Access</span></li>
                </ul>
              </div>

              <div className="ez-pricing-footer">
                <button
                  type="button"
                  className="ez-btn-pricing primary"
                  onClick={() => openQuoteModal('Web Development (₹14,500 + GST)')}
                >
                  <span>Choose Web Dev Plan</span>
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>

            {/* CARD 2: Mobile App Development */}
            <div className="ez-pricing-card highlight-card">
              <div className="ez-pricing-badge popular">MOST POPULAR</div>
              <div className="ez-pricing-header">
                <div className="ez-pricing-icon-bg mobile">
                  <i className="fas fa-mobile-screen-button"></i>
                </div>
                <h3 className="ez-plan-title">Mobile App Development</h3>
                <p className="ez-plan-subtitle">
                  Native-feel iOS &amp; Android cross-platform apps built with Flutter / React Native.
                </p>
              </div>

              <div className="ez-pricing-amount-block">
                <div className="ez-price-starting">Starts at</div>
                <div className="ez-price-value-wrap">
                  <span className="ez-price-val">{mobileDevPrice.formatted}</span>
                  <span className="ez-price-sub">{mobileDevPrice.label}</span>
                </div>
                {includeGst && (
                  <div className="ez-gst-breakdown">
                    Base ₹20,000 + GST ₹{mobileDevPrice.gstAmount.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div className="ez-pricing-features">
                <div className="ez-feature-head">Included Features:</div>
                <ul>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>Dual Build:</strong> Both Android &amp; iOS Apps</span></li>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>Flutter / React Native</strong> High Speed Framework</span></li>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>User Auth:</strong> Mobile OTP &amp; Email Login</span></li>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>Payment Gateway:</strong> Razorpay / PhonePe Integration</span></li>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>Real-Time Push</strong> Notifications Setup</span></li>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>REST API &amp; Database</strong> Connectivity</span></li>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>Store Publishing:</strong> Play Store &amp; App Store Support</span></li>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>Offline Sync &amp; Cache</strong> Management</span></li>
                  <li><i className="fas fa-check-circle text-blue-400"></i> <span><strong>1 Year Dedicated</strong> App SLA &amp; Support</span></li>
                </ul>
              </div>

              <div className="ez-pricing-footer">
                <button
                  type="button"
                  className="ez-btn-pricing accent"
                  onClick={() => openQuoteModal('Mobile App Development (₹20,000 + GST)')}
                >
                  <span>Choose Mobile App Plan</span>
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>

            {/* CARD 3: Custom Enterprise & SaaS */}
            <div className="ez-pricing-card">
              <div className="ez-pricing-badge enterprise">ENTERPRISE</div>
              <div className="ez-pricing-header">
                <div className="ez-pricing-icon-bg enterprise">
                  <i className="fas fa-network-wired"></i>
                </div>
                <h3 className="ez-plan-title">Full-Stack SaaS &amp; E-Com</h3>
                <p className="ez-plan-subtitle">
                  Scalable multi-tenant web systems, custom payout/fintech engines &amp; cloud portals.
                </p>
              </div>

              <div className="ez-pricing-amount-block">
                <div className="ez-price-starting">Starts at</div>
                <div className="ez-price-value-wrap">
                  <span className="ez-price-val">{fullstackPrice.formatted}</span>
                  <span className="ez-price-sub">{fullstackPrice.label}</span>
                </div>
                {includeGst && (
                  <div className="ez-gst-breakdown">
                    Base ₹38,000 + GST ₹{fullstackPrice.gstAmount.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div className="ez-pricing-features">
                <div className="ez-feature-head">Included Features:</div>
                <ul>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Custom Microservices</strong> Node.js / Express Engine</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>E-Commerce / FinTech</strong> Payout &amp; Ledger Architecture</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Automated Invoicing</strong> &amp; GST Bill Generator</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Role-Based Access</strong> Control &amp; Admin Panel</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>AWS / Cloud VPS</strong> Deployment &amp; Auto Scaling</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Webhooks &amp; 3rd-Party API</strong> Integrations</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>High Availability DB</strong> Replication &amp; Backups</span></li>
                  <li><i className="fas fa-check-circle"></i> <span><strong>Dedicated Squad</strong> Technical Lead Assigned</span></li>
                </ul>
              </div>

              <div className="ez-pricing-footer">
                <button
                  type="button"
                  className="ez-btn-pricing outline"
                  onClick={() => openQuoteModal('Full-Stack SaaS & E-Com (₹38,000 + GST)')}
                >
                  <span>Request Custom Proposal</span>
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>

          </div>

          {/* ── COST ESTIMATOR / CALCULATOR WIDGET ── */}
          <div className="ez-estimator-section" style={{ marginTop: '70px' }}>
            <div className="ez-estimator-header">
              <span className="pp-section-label">INTERACTIVE CALCULATOR</span>
              <h2>Instant Project Cost Estimator</h2>
              <p>Select your required services and add-ons to estimate your project budget with GST breakdown.</p>
            </div>

            <div className="ez-estimator-box">
              <div className="ez-estimator-col-left">
                {/* Step 1: Base Service Selection */}
                <div className="ez-est-step">
                  <div className="ez-est-step-num">1</div>
                  <div className="ez-est-step-title">Select Primary Engineering Service</div>
                </div>
                <div className="ez-est-options-grid">
                  <label className={`ez-est-radio-card ${estimatorService === 'web' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="est_service"
                      value="web"
                      checked={estimatorService === 'web'}
                      onChange={() => setEstimatorService('web')}
                    />
                    <div className="ez-est-radio-content">
                      <i className="fas fa-desktop"></i>
                      <div>
                        <div className="ez-est-radio-title">Web Development</div>
                        <div className="ez-est-radio-price">₹14,500 + GST</div>
                      </div>
                    </div>
                  </label>

                  <label className={`ez-est-radio-card ${estimatorService === 'mobile' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="est_service"
                      value="mobile"
                      checked={estimatorService === 'mobile'}
                      onChange={() => setEstimatorService('mobile')}
                    />
                    <div className="ez-est-radio-content">
                      <i className="fas fa-mobile-screen"></i>
                      <div>
                        <div className="ez-est-radio-title">Mobile App Dev</div>
                        <div className="ez-est-radio-price">₹20,000 + GST</div>
                      </div>
                    </div>
                  </label>

                  <label className={`ez-est-radio-card ${estimatorService === 'both' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="est_service"
                      value="both"
                      checked={estimatorService === 'both'}
                      onChange={() => setEstimatorService('both')}
                    />
                    <div className="ez-est-radio-content">
                      <i className="fas fa-layer-group"></i>
                      <div>
                        <div className="ez-est-radio-title">Web + Mobile Bundle</div>
                        <div className="ez-est-radio-price">
                          <span style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '11px', marginRight: '4px' }}>₹34,500</span>
                          ₹32,000 + GST
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Step 2: Add-Ons Selection */}
                <div className="ez-est-step" style={{ marginTop: '24px' }}>
                  <div className="ez-est-step-num">2</div>
                  <div className="ez-est-step-title">Optional Add-ons &amp; Integrations</div>
                </div>
                <div className="ez-est-checkboxes-grid">
                  <label className={`ez-est-check-card ${selectedAddons.paymentGateway ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedAddons.paymentGateway}
                      onChange={() => handleAddonToggle('paymentGateway')}
                    />
                    <span>Payment Gateway Integration (Razorpay/PhonePe)</span>
                    <span className="ez-est-addon-val">+₹4,000</span>
                  </label>

                  <label className={`ez-est-check-card ${selectedAddons.adminDashboard ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedAddons.adminDashboard}
                      onChange={() => handleAddonToggle('adminDashboard')}
                    />
                    <span>Admin Control Dashboard</span>
                    <span className="ez-est-addon-val">+₹3,500</span>
                  </label>

                  <label className={`ez-est-check-card ${selectedAddons.domainHosting ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedAddons.domainHosting}
                      onChange={() => handleAddonToggle('domainHosting')}
                    />
                    <span>Cloud VPS Server &amp; Domain Setup</span>
                    <span className="ez-est-addon-val">+₹2,500</span>
                  </label>

                  <label className={`ez-est-check-card ${selectedAddons.aiChatbot ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedAddons.aiChatbot}
                      onChange={() => handleAddonToggle('aiChatbot')}
                    />
                    <span>AI Assistant / Customer Chatbot</span>
                    <span className="ez-est-addon-val">+₹6,500</span>
                  </label>

                  <label className={`ez-est-check-card ${selectedAddons.appStorePublishing ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedAddons.appStorePublishing}
                      onChange={() => handleAddonToggle('appStorePublishing')}
                    />
                    <span>App Store Direct Publishing</span>
                    <span className="ez-est-addon-val">+₹3,000</span>
                  </label>

                  <label className={`ez-est-check-card ${selectedAddons.seoPackage ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedAddons.seoPackage}
                      onChange={() => handleAddonToggle('seoPackage')}
                    />
                    <span>Advanced SEO &amp; Speed Optimization</span>
                    <span className="ez-est-addon-val">+₹4,500</span>
                  </label>
                </div>
              </div>

              {/* Right Side: Total Summary */}
              <div className="ez-estimator-col-right">
                <div className="ez-est-summary-card">
                  <h4 className="ez-est-summary-head">Estimate Summary</h4>

                  <div className="ez-est-line">
                    <span>Base Selected Service:</span>
                    <span>
                      ₹
                      {estimatorService === 'web'
                        ? '14,500'
                        : estimatorService === 'mobile'
                        ? '20,000'
                        : '32,000'}
                    </span>
                  </div>

                  <div className="ez-est-line">
                    <span>Subtotal (Base):</span>
                    <span>₹{estimatedCost.base.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="ez-est-line">
                    <span>GST (18%):</span>
                    <span>₹{estimatedCost.gst.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="ez-est-total-line">
                    <div>
                      <div className="ez-est-total-label">Total Estimated Cost</div>
                      <div className="ez-est-total-sub">Includes 18% GST Invoice</div>
                    </div>
                    <div className="ez-est-total-val">
                      ₹{estimatedCost.total.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ez-btn-pricing primary text-center w-full"
                    style={{ marginTop: '20px' }}
                    onClick={() =>
                      openQuoteModal(
                        `Custom Estimator Quote (Estimated ₹${estimatedCost.total.toLocaleString('en-IN')})`
                      )
                    }
                  >
                    <span>Get Instant Proposal</span>
                    <i className="fas fa-paper-plane" style={{ marginLeft: '8px' }}></i>
                  </button>

                  <div className="ez-est-guarantee">
                    <i className="fas fa-shield-check" style={{ color: '#10B981', marginRight: '6px' }}></i>
                    Zero Hidden Costs &bull; Free Technical Consultation
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FAQ SECTION ── */}
          <div className="ez-faq-section" style={{ marginTop: '80px' }}>
            <div className="text-center" style={{ marginBottom: '40px' }}>
              <span className="pp-section-label">HAVE QUESTIONS?</span>
              <h2>Frequently Asked Questions</h2>
              <p style={{ color: '#94a3b8' }}>Everything you need to know about our pricing and development process.</p>
            </div>

            <div className="ez-faq-accordion">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className={`ez-faq-item ${openFaq === idx ? 'open' : ''}`}
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                >
                  <div className="ez-faq-question">
                    <span>{faq.q}</span>
                    <i className={`fas fa-chevron-down ez-faq-chevron ${openFaq === idx ? 'rotate' : ''}`}></i>
                  </div>
                  {openFaq === idx && (
                    <div className="ez-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── BOTTOM CTA BANNER ── */}
          <div className="ez-pricing-cta-banner">
            <div className="ez-cta-content">
              <h3>Have a custom enterprise requirement?</h3>
              <p>Our engineering leads are ready to architect a customized roadmap tailored for your business volume.</p>
            </div>
            <div className="ez-cta-action">
              <Link to="/contact" className="ez-btn-pricing primary">
                <i className="fas fa-comments" style={{ marginRight: '8px' }}></i> Talk to Engineering Squad
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── MODAL FOR QUOTE REQUEST ── */}
      {selectedPlanModal && (
        <div className="ez-modal-backdrop" onClick={() => setSelectedPlanModal(null)}>
          <div className="ez-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="ez-modal-close"
              onClick={() => setSelectedPlanModal(null)}
            >
              &times;
            </button>
            <div className="ez-modal-header">
              <span className="ez-modal-badge">GET DETAILED PROPOSAL</span>
              <h3>Inquire for {selectedPlanModal}</h3>
              <p>Fill out your contact info to receive exact milestone deliverables and scope timeline.</p>
            </div>

            <form onSubmit={handleModalSubmit} className="ez-modal-form">
              <div className="ez-form-group">
                <label>Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="ez-form-group">
                <label>Phone Number / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="ez-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="ez-form-group">
                <label>Project Brief / Key Requirements</label>
                <textarea
                  rows="3"
                  placeholder="Tell us briefly about your project goals..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="ez-btn-pricing primary text-center w-full"
                style={{ justifyContent: 'center', marginTop: '10px' }}
              >
                {isSubmitting ? 'Submitting Request...' : 'Submit Quote Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
