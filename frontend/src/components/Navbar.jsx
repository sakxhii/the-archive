
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();
    const isHome = location.pathname === '/';
    const isDashboard = location.pathname === '/owner';

    return (
        <header className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-xl border-b-2 border-brand-100 shadow-xl transition-all duration-300">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-50/50 via-transparent to-primary-50/50 pointer-events-none"></div>

            <div className="container mx-auto px-6 h-20 flex justify-between items-center relative z-10">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-4 group">
                    {/* Icon with gradient and glow */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-primary-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative bg-gradient-to-br from-brand-900 via-brand-800 to-primary-900 text-white p-3 rounded-2xl group-hover:from-brand-800 group-hover:via-brand-700 group-hover:to-primary-800 transition-all duration-300 shadow-xl group-hover:shadow-2xl group-hover:scale-105">
                            <span className="material-icons-outlined text-2xl">card_giftcard</span>
                        </div>
                    </div>

                    {/* Text */}
                    <div>
                        <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-brand-900 to-brand-700 bg-clip-text text-transparent tracking-tight leading-none group-hover:from-brand-800 group-hover:to-brand-600 transition-all">
                            The Archive
                        </h1>
                        <p className="text-[10px] font-sans text-brand-500 uppercase tracking-[0.2em] font-bold mt-0.5">
                            Meaningful Gifting
                        </p>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    {/* Find Collection Link */}
                    <Link
                        to="/"
                        className="relative group px-4 py-2"
                    >
                        <span className={`text-sm font-bold transition-colors duration-200 relative z-10
                            ${isHome ? 'text-brand-900' : 'text-brand-600 group-hover:text-brand-900'}
                        `}>
                            Find Collection
                        </span>

                        {/* Animated underline with gradient */}
                        <span className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-accent-light to-accent rounded-full transition-all duration-300 origin-left
                            ${isHome ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'}
                        `}></span>

                        {/* Hover background */}
                        <span className="absolute inset-0 bg-brand-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></span>
                    </Link>

                    {/* Owner Dashboard Button */}
                    <Link
                        to="/owner"
                        className="relative group overflow-hidden"
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-accent/40 to-primary-500/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        {/* Button */}
                        <div className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg group-hover:shadow-2xl transform group-hover:-translate-y-0.5 active:translate-y-0
                            ${isDashboard
                                ? 'bg-gradient-to-r from-accent to-accent-dark text-white'
                                : 'bg-gradient-to-r from-brand-900 to-brand-800 hover:from-brand-800 hover:to-brand-700 text-white'
                            }
                        `}>
                            <span className="material-icons-outlined text-lg">dashboard</span>
                            <span>Owner Dashboard</span>

                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        </div>
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
