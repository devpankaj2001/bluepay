import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Smartphone, Lock, Loader, ArrowRight, ShieldCheck, Zap, Globe, Eye, EyeOff, Shield } from 'lucide-react';

const Login = () => {
    const [credentials, setCredentials] = useState({
        emailOrMobile: '',
        password: '',
    });
    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'mobile'
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(credentials);
            toast.success('Login Successful!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Invalid Credentials');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: Zap, title: "Lightning Fast", desc: "Instant payouts with 99.9% uptime" },
        { icon: ShieldCheck, title: "Bank-Grade Security", desc: "Advanced encryption & compliance" },
        { icon: Globe, title: "Reliable", desc: "Trusted by 10,000+ businesses" },
    ];

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Left Side - Promotional Content (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-blue-700 relative overflow-hidden flex-col justify-between p-12 text-white">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full blur-3xl opacity-50 -ml-20 -mb-20"></div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <Shield className="text-white w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">BluePay</span>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 mt-16">
                    <h1 className="text-5xl font-extrabold leading-tight mb-6">
                        The Future of <br />
                        <span className="text-blue-200">Multiple Marketplace</span> <br />
                        Businesses Payment <br />
                        Solution
                    </h1>
                    <p className="text-blue-100 text-lg max-w-lg mb-12">
                        Seamless, secure, and lightning-fast payment solutions for modern businesses.
                    </p>

                    <div className="space-y-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                    <feature.icon className="w-6 h-6 text-blue-200" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{feature.title}</h3>
                                    <p className="text-blue-200 text-sm">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Card */}
                <div className="relative z-10 mt-12 bg-blue-800/50 backdrop-blur-md rounded-2xl p-6 border border-blue-600/50 max-w-md">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-blue-300" />
                        <span className="text-blue-200 text-sm font-medium">Trusted Globally</span>
                    </div>
                    <div className="text-3xl font-bold">₹50Cr+</div>
                    <div className="text-blue-200 text-sm">Processed Monthly</div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                        <p className="mt-2 text-gray-500">Sign in to your account to continue</p>
                    </div>

                    <div className="mt-8">
                        {/* Login Method Toggle */}
                        <div className="bg-gray-100 p-1 rounded-lg flex mb-6">
                            <button
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setLoginMethod('email')}
                            >
                                Email
                            </button>
                            <button
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'mobile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setLoginMethod('mobile')}
                            >
                                Mobile
                            </button>
                        </div>

                        <form className="space-y-6" onSubmit={handleLogin}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {loginMethod === 'email' ? (
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <Smartphone className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                    <input
                                        name="emailOrMobile"
                                        type={loginMethod === 'email' ? 'email' : 'text'}
                                        required
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                        placeholder={loginMethod === 'email' ? 'john@example.com' : '+91 98765 43210'}
                                        value={credentials.emailOrMobile}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                        placeholder="Enter your password"
                                        value={credentials.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                {loading ? (
                                    <Loader className="animate-spin h-5 w-5 text-white" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Sign In <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">or</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors items-center gap-2">
                                    <span className="font-bold text-gray-900">G</span>
                                    <span>Google</span>
                                </button>
                                <button className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors items-center gap-2">
                                    <span className="font-bold text-blue-800">f</span>
                                    <span>Facebook</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-gray-600">
                                Don't have an account?{' '}
                                <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                                    Sign up
                                </Link>
                            </p>
                        </div>

                        <div className="mt-8 text-center text-xs text-gray-400">
                            <p>Protected by industry-leading security standards</p>
                            <p>© 2026 BluePay. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
