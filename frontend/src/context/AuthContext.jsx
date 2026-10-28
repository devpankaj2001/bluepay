/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from 'react';
import * as authService from '../services/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        const data = await authService.login(credentials);
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    };

    const register = async (userData) => {
        return await authService.register(userData);
    };

    const verifyOtp = async (data) => {
        return await authService.verifyOtp(data);
    };

    const resendOtp = async (data) => {
        return await authService.resendOtp(data);
    };

    const logout = () => {
        authService.logout();
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, resendOtp, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
