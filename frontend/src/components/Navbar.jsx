
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <header className="fixed w-full top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-brand-100 shadow-sm transition-all duration-300">
            <div className="container mx-auto px-6 h-20 flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="bg-brand-800 text-white p-2 rounded-lg group-hover:bg-brand-700 transition-colors shadow-sm">
                        <span className="material-icons-outlined text-2xl">card_giftcard</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-brand-900 tracking-tight leading-none group-hover:text-brand-700 transition">The Archive</h1>
                        <p className="text-[10px] font-sans text-brand-400 uppercase tracking-widest font-semibold">Meaningful Gifting</p>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link
                        to="/"
                        className={`text-sm font-medium transition-colors duration-200 relative group py-1
                            ${isHome ? 'text-brand-800 font-semibold' : 'text-brand-500 hover:text-brand-800'}
                        `}
                    >
                        Find Collection
                        <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-full transition-transform duration-300 origin-left 
                            ${isHome ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}
                        `}></span>
                    </Link>

                    <Link
                        to="/owner"
                        className="text-sm font-medium text-white bg-brand-800 hover:bg-brand-700 px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Owner Dashboard
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
