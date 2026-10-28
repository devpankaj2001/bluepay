import { useState } from 'react';
import Navbar from '../components/Navbar';

const GSTCalculator = () => {
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('18');
    const [type, setType] = useState('exclusive');
    const [result, setResult] = useState({ base: 0, gst: 0, total: 0 });

    const handleCalculate = () => {
        const val = parseFloat(amount);

        if (isNaN(val)) {
            setResult({ base: 0, gst: 0, total: 0 });
            return;
        }

        const r = parseFloat(rate);
        let base = 0, gst = 0, total = 0;

        if (type === 'exclusive') {
            // GST Exclusive (Add GST)
            base = val;
            gst = (val * r) / 100;
            total = base + gst;
        } else {
            // GST Inclusive (Remove GST)
            total = val;
            const gstFactor = 1 + (r / 100);
            base = val / gstFactor;
            gst = total - base;
        }

        setResult({ base, gst, total });
    };

    // Format currency
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(val);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ overflowX: 'hidden' }}>
            <div style={{ height: '114px' }}></div>
            <Navbar />

            {/* Inner Hero Breadcrumb */}
            <section className="pp-hero">
                <div className="container">
                    <span className="pp-hero-badge"><i className="fas fa-calculator" style={{ marginRight: '6px' }}></i> FREE BUSINESS TOOLS</span>
                    <h1>GST Calculation Engine</h1>
                    <p className="pp-hero-desc">Calculate Goods and Services Tax (GST) inclusive or exclusive percentages easily.</p>
                    <ul className="pp-breadcrumb">
                        <li><a href="/">Home</a></li>
                        <li className="active"><a href="#">GST Calculator</a></li>
                    </ul>
                </div>
            </section>

            <section className="pp-section bg-slate-900/50">
                <div className="container">
                    <div className="row flex flex-wrap" style={{ display: 'flex', gap: '30px' }}>
                        
                        {/* Input Panel */}
                        <div className="col-lg-6" style={{ flex: '1 0 350px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '36px', borderRadius: '16px' }}>
                            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Calculate GST</h3>
                            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Enter transaction amounts and Select your region's tax rate.</p>

                            <div className="space-y-5">
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>Calculation Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        style={{ width: '100%', padding: '12px 14px', background: '#070b16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                    >
                                        <option value="exclusive">GST Exclusive (Add GST)</option>
                                        <option value="inclusive">GST Inclusive (Remove GST)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                                        {type === 'exclusive' ? 'Base Amount (₹)' : 'Total Amount (₹)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        style={{ width: '100%', padding: '12px 14px', background: '#070b16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>GST Rate (%)</label>
                                    <select
                                        value={rate}
                                        onChange={(e) => setRate(e.target.value)}
                                        style={{ width: '100%', padding: '12px 14px', background: '#070b16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                    >
                                        <option value="5">5% (Essentials)</option>
                                        <option value="12">12% (Standard Items)</option>
                                        <option value="18">18% (IT &amp; Gateway Services)</option>
                                        <option value="28">28% (Luxury Goods)</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleCalculate}
                                    className="px-btn px-btn-primary"
                                    style={{ width: '100%', border: 'none', marginTop: '10px' }}
                                >
                                    Calculate GST
                                </button>
                            </div>
                        </div>

                        {/* Result Panel */}
                        <div className="col-lg-6" style={{ flex: '1 0 350px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '36px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Calculation Result</h3>
                                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Detailed breakdown of transaction values.</p>

                                <div style={{ background: '#070b16', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Base Amount</span>
                                    <strong style={{ fontSize: '24px', color: '#fff' }}>{formatCurrency(result.base)}</strong>
                                </div>

                                <div style={{ background: '#070b16', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>GST Tax Amount ({rate}%)</span>
                                    <strong style={{ fontSize: '24px', color: '#2F49C8' }}>{formatCurrency(result.gst)}</strong>
                                </div>
                            </div>

                            <div>
                                <div style={{ background: 'linear-gradient(135deg, #2F49C8, #4B5CE4)', padding: '20px', borderRadius: '12px', color: '#fff', marginBottom: '20px' }}>
                                    <span style={{ display: 'block', fontSize: '13px', opacity: '0.8', marginBottom: '4px' }}>Total Settlement Value</span>
                                    <strong style={{ fontSize: '32px' }}>{formatCurrency(result.total)}</strong>
                                </div>

                                <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                                    <strong>Disclaimer:</strong> This calculation engine estimates Indian GST based on default schedules. Actual tax percentages are based on specific product codes. Consult tax professionals for billing compliance.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Information Grid */}
            <section className="pp-section bg-slate-950">
                <div className="container">
                    <div className="px-sh px-sh-center">
                        <span className="pp-section-label">Compliance Schedules</span>
                        <h2 className="pp-section-title" style={{ color: '#fff' }}>Standard GST Schedules</h2>
                    </div>
                    <div className="row flex flex-wrap justify-between" style={{ display: 'flex', gap: '20px' }}>
                        {[
                            { rate: '5%', title: 'Essential Items', desc: 'Basic goods, essential medicines, economy transport services.' },
                            { rate: '12%', title: 'Standard Low', desc: 'Processed food, computer hardware, business class flight tickets.' },
                            { rate: '18%', title: 'Standard General', desc: 'Most manufacturing items, software licensing, IT services & banking.' },
                            { rate: '28%', title: 'Luxury & Demerit', desc: 'Automobiles, luxury items, high-end hotel stays, tobacco.' }
                        ].map((item, idx) => (
                            <div key={idx} className="col-lg-3" style={{ flex: '1 0 220px', padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                <span style={{ fontSize: '36px', fontWeight: '800', color: '#2F49C8', display: 'block', marginBottom: '10px' }}>{item.rate}</span>
                                <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{item.title}</h4>
                                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default GSTCalculator;
