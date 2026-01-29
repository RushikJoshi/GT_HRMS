import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/candidate/Header';
import { useAuth } from '../context/AuthContext';

export default function CandidateLayout() {
    const { user } = useAuth();
    const [companyName, setCompanyName] = useState('Gitakshmi');

    useEffect(() => {
        if (user?.companyName) {
            setCompanyName(user.companyName);
        } else {
            const comp = localStorage.getItem('companyName');
            if (comp) setCompanyName(comp);
        }
    }, [user]);

    return (
        <div className="bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col min-h-screen">
                <Header />

                <main className="flex-1 overflow-x-hidden p-6 lg:p-10">
                    <div className="max-w-[1600px] mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
