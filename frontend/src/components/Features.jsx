import { Zap, ShieldCheck, Clock, BarChart3 } from 'lucide-react';

const Features = () => {
    const features = [
        {
            icon: <Zap size={24} />,
            title: 'Instant Payouts',
            description: 'UPI/IMPS/NEFT transfers processed in seconds, 24x7 availability'
        },
        {
            icon: <ShieldCheck size={24} />,
            title: 'Bank-Grade Security',
            description: 'TLS 1.2+ encryption, secure API keys, audit trails'
        },
        {
            icon: <Clock size={24} />,
            title: 'Real-time Processing',
            description: 'Live status updates, webhook notifications'
        },
        {
            icon: <BarChart3 size={24} />,
            title: 'Advanced Analytics',
            description: 'Detailed reports, transaction insights, export data'
        }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">

                {/* Section Header */}
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                        Everything you need for payouts
                    </h2>
                    <p className="text-lg text-slate-500">
                        Comprehensive payment infrastructure with enterprise-grade security and reliability
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            {/* Icon */}
                            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold text-slate-900 mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default Features;
