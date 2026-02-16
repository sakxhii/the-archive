
import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

const CustomerSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ internal: [], web_products: [], web_vendors: [] });
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(false);
        try {
            const res = await axios.post(`${API_BASE_URL}/search-gifts`, { query });
            setResults({
                internal: res.data.internal_results || [],
                web_products: res.data.web_products || [],
                web_vendors: res.data.web_vendors || []
            });
            setSearched(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-brand-50 pt-20 ${searched ? 'min-h-screen' : 'h-screen overflow-hidden'}`}>

            {/* Hero Section */}
            <div className={`transition-all duration-700 ${searched ? 'py-16' : 'min-h-[calc(100vh-5rem)] flex items-center'} bg-white border-b border-brand-100 flex flex-col justify-center`}>
                <div className="container mx-auto max-w-4xl text-center px-4">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-brand-900 mb-6 tracking-tight leading-snug">
                        The Archive: Your Rolodex for <span className="text-accent underline decoration-4 decoration-accent/30 underline-offset-4">Meaningful Gifting.</span>
                    </h1>
                    <p className="text-brand-500 font-sans text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                        Seamlessly find verified vendors from your personal network or discover global trends. Turn business cards into business opportunities.
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto shadow-2xl rounded-full transition-transform hover:scale-[1.01] duration-300">
                        <div className="absolute inset-0 bg-brand-200 rounded-full blur-md opacity-50 -z-10"></div>
                        <div className="relative flex items-center bg-white rounded-full border border-brand-100 p-2 overflow-hidden shadow-sm">
                            <span className="material-icons-outlined text-brand-300 pl-4 text-2xl select-none">search</span>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search for 'Eco-friendly hampers', 'Printing vendors', or 'Diwali gifts'..."
                                className="flex-1 py-4 px-4 text-brand-800 placeholder-brand-300 focus:outline-none text-lg font-medium bg-transparent"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => { setQuery(''); setResults({ internal: [], web: [] }); setSearched(false); }}
                                    className="p-3 text-brand-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 mr-1"
                                >
                                    <span className="material-icons-outlined text-xl">close</span>
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-brand-800 text-white px-8 py-3 rounded-full font-semibold hover:bg-brand-700 transition-all active:scale-95 shadow-md flex items-center gap-2 whitespace-nowrap"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Looking...</span>
                                    </>
                                ) : (
                                    'Discover'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Prompt Hints */}
                    {!searched && (
                        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-brand-400 font-medium">
                            <span>Try:</span>
                            <button onClick={() => setQuery("Custom Diaries")} className="hover:text-accent transition underline decoration-dashed decoration-brand-200 underline-offset-4">"Custom Diaries"</button>
                            <span className="text-brand-200">•</span>
                            <button onClick={() => setQuery("Gourmet Hampers")} className="hover:text-accent transition underline decoration-dashed decoration-brand-200 underline-offset-4">"Gourmet Hampers"</button>
                            <span className="text-brand-200">•</span>
                            <button onClick={() => setQuery("Sustainable Tech")} className="hover:text-accent transition underline decoration-dashed decoration-brand-200 underline-offset-4">"Sustainable Tech"</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="container mx-auto px-6 py-16 xl:px-24">

                {searched && (
                    <div className="space-y-20 animate-fade-in-up">

                        {/* 1. Internal Database Results */}
                        <section>
                            <div className="flex items-center gap-4 mb-10 pb-4 border-b border-brand-100">
                                <div className="p-3 bg-brand-50 rounded-xl text-brand-600 shadow-sm border border-brand-100">
                                    <span className="material-icons-outlined text-2xl">verified_user</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold font-serif text-brand-900 leading-tight">Vendor Network</h2>
                                    <p className="text-brand-400 text-sm font-medium tracking-wide uppercase">Exclusive Partners & Local Artisans</p>
                                </div>
                            </div>

                            {results.internal.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {results.internal.map((item, idx) => (
                                        <div key={idx} className="group bg-white rounded-xl overflow-hidden border border-brand-100 hover:border-brand-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                                            {/* Image Area */}
                                            <div className="relative aspect-[4/3] bg-brand-50 overflow-hidden border-b border-brand-50">
                                                {item.image_url && !item.image_url.includes('None') ? (
                                                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-brand-200">
                                                        <span className="material-icons-outlined text-5xl mb-2">image_not_supported</span>
                                                        <span className="text-xs font-medium uppercase tracking-widest">No Image</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-brand-800 text-[10px] font-bold px-3 py-1.5 rounded-md shadow-sm border border-brand-100 uppercase tracking-widest flex items-center gap-1">
                                                    <span className="material-icons-outlined text-xs text-accent">verified</span>
                                                    Verified
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-6 flex-1 flex flex-col">
                                                <h3 className="font-bold text-brand-800 text-lg mb-2 leading-snug group-hover:text-accent transition-colors truncate">{item.title}</h3>
                                                <div className="h-0.5 w-12 bg-accent/50 rounded-full mb-4"></div>
                                                <p className="text-brand-500 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">{item.description}</p>

                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full block text-center bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold py-3 rounded-xl transition-all border border-brand-200 hover:border-brand-300 text-xs uppercase tracking-widest group-hover:shadow-md"
                                                >
                                                    Contact Vendor
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-dashed border-brand-200 p-12 text-center">
                                    <span className="material-icons-outlined text-4xl text-brand-200 mb-4 block">domain_disabled</span>
                                    <h3 className="text-lg font-semibold text-brand-400">No matching vendors found</h3>
                                    <p className="text-brand-300 text-sm mt-1">Try broadening your search terms.</p>
                                </div>
                            )}
                        </section>

                        {/* 2. Global Vendor Search (NEW) */}
                        <section>
                            <div className="flex items-center gap-4 mb-10 pb-4 border-b border-brand-100">
                                <div className="p-3 bg-purple-50 rounded-xl text-purple-600 shadow-sm border border-purple-100">
                                    <span className="material-icons-outlined text-2xl">travel_explore</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold font-serif text-brand-900 leading-tight">Global Suppliers</h2>
                                    <p className="text-brand-400 text-sm font-medium tracking-wide uppercase">Top International Brands & Manufacturers</p>
                                </div>
                            </div>

                            {results.web_vendors.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {results.web_vendors.map((item, idx) => (
                                        <div key={idx} className="bg-white rounded-xl p-6 border border-brand-100 hover:border-purple-200 hover:shadow-md transition-all group flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                    <span className="material-icons-outlined">business</span>
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-300 bg-brand-50 px-2 py-1 rounded">Global</span>
                                            </div>

                                            <h3 className="font-bold text-brand-800 text-lg mb-2">{item.title}</h3>
                                            <p className="text-brand-500 text-sm mb-6 flex-grow">{item.description}</p>

                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-auto text-purple-600 text-sm font-bold flex items-center gap-2 hover:gap-3 transition-all"
                                            >
                                                Visit Website <span className="material-icons-outlined text-sm">arrow_forward</span>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-dashed border-brand-200 p-8 text-center">
                                    <span className="material-icons-outlined text-3xl text-brand-200 mb-2">business_center</span>
                                    <p className="text-brand-400 text-sm">No global vendors found for this search.</p>
                                </div>
                            )}
                        </section>

                        {/* 3. Web Search Results (Products) */}
                        <section>
                            <div className="flex items-center gap-4 mb-10 pb-4 border-b border-brand-100">
                                <div className="p-3 bg-accent/10 rounded-xl text-accent shadow-sm border border-accent/20">
                                    <span className="material-icons-outlined text-2xl">public</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold font-serif text-brand-900 leading-tight">Global Ideas</h2>
                                    <p className="text-brand-400 text-sm font-medium tracking-wide uppercase">Trending Online Suggestions</p>
                                </div>
                            </div>

                            {results.web_products.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {results.web_products.map((item, idx) => (
                                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-brand-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative overflow-hidden group hover:border-accent/30">
                                            {/* Accent Bar */}
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            <div className="pl-4 flex-1 flex flex-col relative z-10">
                                                <div className="flex justify-between items-start mb-3 gap-4">
                                                    <h3 className="font-bold text-brand-800 text-xl leading-tight font-serif group-hover:text-accent transition-colors">{item.title}</h3>
                                                    <span className="bg-brand-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap">
                                                        {item.price}
                                                    </span>
                                                </div>

                                                <p className="text-brand-500 text-sm mb-6 line-clamp-4 leading-relaxed flex-grow border-l-2 border-brand-100 pl-4 group-hover:border-accent/30 transition-colors">
                                                    {item.description}
                                                </p>

                                                <div className="flex items-center justify-between mt-auto pt-5 border-t border-brand-50">
                                                    <span className="text-xs text-brand-300 flex items-center gap-1 font-medium bg-brand-50 px-2 py-1 rounded">
                                                        <span className="material-icons-outlined text-[10px]">public</span>
                                                        Web
                                                    </span>
                                                    <a
                                                        href={item.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-accent hover:text-orange-700 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all group-hover:translate-x-1 uppercase tracking-wider text-[10px]"
                                                    >
                                                        Visit Product <span className="material-icons-outlined text-sm">arrow_forward</span>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-dashed border-brand-200 p-12 text-center">
                                    <span className="material-icons-outlined text-4xl text-brand-200 mb-4 block">wifi_off</span>
                                    <h3 className="text-lg font-semibold text-brand-400">No web results found</h3>
                                    <p className="text-brand-300 text-sm mt-1">The internet is quiet on this topic right now.</p>
                                </div>
                            )}
                        </section>

                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerSearch;
