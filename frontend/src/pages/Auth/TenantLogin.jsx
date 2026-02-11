import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getToken, isValidToken } from '../../utils/token';

/**
 * Tenant Login Wrapper
 * Reuses existing HR login logic but locked to tenant/HR role
 */
export default function TenantLogin() {
    const navigate = useNavigate();
    const { loginHR, user, isInitialized } = useAuth();

    const [companyCode, setCompanyCode] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // Redirect if already logged in as HR/Tenant
    useEffect(() => {
        if (!isInitialized) return;

        const token = getToken();
        if (!isValidToken(token)) return;

        if (user && (user.role === 'hr' || user.role === 'admin')) {
            navigate('/tenant/dashboard', { replace: true });
        }
    }, [isInitialized, user, navigate]);

    async function handleLogin(e) {
        e.preventDefault();
        setError("");

        try {
            const res = await loginHR(companyCode, email, password);
            if (res.success) {
                navigate('/tenant/dashboard', { replace: true });
                return;
            }
            setError(res.message || "Login failed");
        } catch (err) {
            setError("An unexpected error occurred");
            console.error(err);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="relative w-full max-w-md mx-auto">
                <div className="absolute -left-20 -top-16 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-40" />
                <div className="absolute -right-16 -bottom-20 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40" />
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-10 w-full">
                        <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">Tenant Login</h2>
                        <p className="text-sm text-slate-500 text-center mb-6">Company HR Administrator Access</p>

                        {error && (
                            <div className="p-3 mb-4 bg-red-50 text-red-700 text-sm rounded border border-red-100">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-600">Company Code</label>
                                <input
                                    type="text"
                                    value={companyCode}
                                    onChange={e => setCompanyCode(e.target.value)}
                                    className="w-full mt-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none shadow-sm"
                                    placeholder="e.g. pnr001"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Email</label>
                                <input
                                    type="email"
                                    className="w-full mt-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none shadow-sm"
                                    placeholder="admin@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Password</label>
                                <input
                                    type="password"
                                    className="w-full mt-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 outline-none shadow-sm"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 shadow"
                            >
                                Submit
                            </button>
                        </form>

                        {/* <div className="mt-6 text-center space-y-2">
                            <p className="text-sm text-slate-500">Other login options:</p>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => navigate('/super-admin/login')}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Super Admin Login
                                </button>
                                <button
                                    onClick={() => navigate('/employee/login')}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Employee Login
                                </button>
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
