import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Smartphone, User, Lock, Loader, ArrowRight, ShieldCheck, Zap, Globe, Eye, EyeOff, Shield } from 'lucide-react';

const Signup = () => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        password: '',
        confirm_password: '',
    });

    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: Register, 2: Verify OTP
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register, verifyOtp, resendOtp, login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirm_password) {
            return toast.error("Passwords do not match");
        }
        setLoading(true);
        try {
            const response = await register(formData);
            if (response && response.userId) {
                setUserId(response.userId);
                setStep(2);
                toast.success('OTP sent to your email!');
            } else {
                toast.error('Registration failed. Please try again.');
            }
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await verifyOtp({ userId, otp });
            toast.success('Account verified successfully!');
            try {
                await login({ emailOrMobile: formData.email, password: formData.password });
                navigate('/dashboard');
            } catch {
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            await resendOtp({ userId });
            toast.success('OTP Resent successfully!');
        } catch {
            toast.error('Failed to resend OTP');
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

            {/* Right Side - Signup Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
                <div className="w-full max-w-md space-y-8">
                    {step === 1 ? (
                        <>
                            <div className="text-center lg:text-left">
                                <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                                <p className="mt-2 text-gray-500">Join thousands of businesses using our platform</p>
                            </div>

                            <form className="mt-8 space-y-4" onSubmit={handleRegister}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <input
                                            name="first_name"
                                            type="text"
                                            required
                                            className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                            placeholder="John"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input
                                            name="last_name"
                                            type="text"
                                            required
                                            className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                            placeholder="Doe"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Smartphone className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            name="mobile_number"
                                            type="text"
                                            required
                                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                            placeholder="+91 98765 43210"
                                            value={formData.mobile_number}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                            placeholder="john@example.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
                                            value={formData.password}
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            name="confirm_password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                            placeholder="Confirm your password"
                                            value={formData.confirm_password}
                                            onChange={handleChange}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        id="agree-terms"
                                        name="agree-terms"
                                        type="checkbox"
                                        required
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-600">
                                        I agree to the <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Terms of Service</a> and <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Privacy Policy</a>
                                    </label>
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
                                            Create Account <ArrowRight className="h-4 w-4" />
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
                                    Already have an account?{' '}
                                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-center lg:text-left">
                                <h2 className="text-3xl font-bold text-gray-900">Verify Account</h2>
                                <p className="mt-2 text-gray-500">Enter the OTP sent to {formData.email}</p>
                            </div>

                            <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
                                <div className="flex justify-center">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        className="w-full text-center text-3xl tracking-widest border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none py-4"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="• • • • • •"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <p className="text-gray-500">Didn't receive code?</p>
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={loading}
                                        className="font-medium text-blue-600 hover:text-blue-500"
                                    >
                                        Resend OTP
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                >
                                    {loading ? <Loader className="animate-spin h-5 w-5 text-white" /> : 'Verify Account'}
                                </button>
                            </form>
                            <div className="mt-8 text-center">
                                <p className="text-sm text-gray-600">
                                    Wrong Email?{' '}
                                    <button onClick={() => setStep(1)} className="font-medium text-blue-600 hover:text-blue-500">
                                        Change details
                                    </button>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Signup;
