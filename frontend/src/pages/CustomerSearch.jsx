
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
        console.log("Searching for:", query);
        if (!query.trim()) return;

        setLoading(true);
        // setSearched(false); // Keep previous results while loading? Or clear? Let's keep clear for now but maybe that's why user thinks it's not working if it flashes?
        // Actually, user said RESULTS ARE NOT DISPLAYING. So maybe response is empty.

        try {
            const res = await axios.post(`${API_BASE_URL}/search-gifts`, { query });
            console.log("Search API Response:", res.data);

            if (res.data.internal_results?.length === 0 && res.data.web_products?.length === 0 && res.data.web_vendors?.length === 0) {
                console.warn("No results found in any category.");
            }

            setResults({
                internal: res.data.internal_results || [],
                web_products: res.data.web_products || [],
                web_vendors: res.data.web_vendors || []
            });
            setSearched(true);
        } catch (err) {
            console.error("Search Failed:", err);
            if (err.response) {
                console.error("Server Error Details:", err.response.data);
                alert(`Search failed: ${err.response.data.detail || "Unknown server error"}`);
            } else {
                alert("Search failed. Please check your connection.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-gradient-to-br from-brand-50 via-white to-primary-50/30 pt-10 ${searched ? 'min-h-screen' : 'h-screen overflow-hidden'}`}>

            {/* Hero Section */}
            <div className={`relative transition-all duration-700 ${searched ? 'py-20' : 'min-h-[calc(100vh-5rem)] flex items-center'} bg-gradient-to-br from-brand-900 via-brand-800 to-primary-900 flex flex-col justify-center overflow-hidden`}>
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="container mx-auto max-w-5xl text-center px-6 relative z-10">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full mb-8 border border-white/20 shadow-lg">
                        <span className="material-icons-outlined text-accent text-sm">auto_awesome</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-white">Discover Perfect Gifts</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 tracking-tight leading-tight">
                        The Archive: Your Rolodex for <br />
                        <span className="bg-gradient-to-r from-accent via-accent-light to-accent bg-clip-text text-transparent drop-shadow-lg">Meaningful Gifting.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-brand-100 font-light mb-12 max-w-3xl mx-auto leading-relaxed">
                        Seamlessly find verified vendors from your personal network or discover global trends. Turn business cards into business opportunities.
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto mb-8">
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-accent/50 via-primary-500/50 to-accent/50 rounded-2xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>

                        <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl border-2 border-white/50 p-2 overflow-hidden shadow-2xl hover:shadow-accent/20 transition-all">
                            <span className="material-icons-outlined text-brand-400 pl-5 text-3xl select-none">search</span>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search for 'Eco-friendly hampers', 'Printing vendors', or 'Diwali gifts'..."
                                className="flex-1 py-5 px-5 text-brand-900 placeholder-brand-400 focus:outline-none text-lg font-medium bg-transparent"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => { setQuery(''); setResults({ internal: [], web_products: [], web_vendors: [] }); setSearched(false); }}
                                    className="p-3 text-brand-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50 mr-2 group"
                                >
                                    <span className="material-icons-outlined text-2xl group-hover:rotate-90 transition-transform">close</span>
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-brand-900 to-brand-800 hover:from-brand-800 hover:to-brand-700 text-white px-10 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg hover:shadow-xl flex items-center gap-3 whitespace-nowrap disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Searching...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Discover</span>
                                        <span className="material-icons-outlined">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Prompt Hints */}
                    {!searched && (
                        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
                            <span className="text-brand-200">Try:</span>
                            {['Custom Diaries', 'Gourmet Hampers', 'Sustainable Tech'].map((hint, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setQuery(hint)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/40 rounded-xl text-white transition-all hover:scale-105 shadow-lg"
                                >
                                    "{hint}"
                                </button>
                            ))}
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
                            <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-brand-200">
                                <div className="p-4 bg-gradient-to-br from-brand-100 to-brand-50 rounded-2xl text-brand-700 shadow-lg border-2 border-brand-200">
                                    <span className="material-icons-outlined text-3xl">verified_user</span>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold font-serif text-brand-900 leading-tight">Vendor Network</h2>
                                    <p className="text-brand-500 text-sm font-semibold tracking-wide uppercase">Exclusive Partners & Local Artisans</p>
                                </div>
                            </div>

                            {results.internal.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {results.internal.map((item, idx) => (
                                        <div key={idx} className="group bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-brand-100 hover:border-accent/40 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full">
                                            {/* Image Area */}
                                            <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-50 to-brand-100 overflow-hidden border-b-2 border-brand-100">
                                                {item.image_url && !item.image_url.includes('None') ? (
                                                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-brand-300">
                                                        <span className="material-icons-outlined text-6xl mb-3">image_not_supported</span>
                                                        <span className="text-xs font-bold uppercase tracking-widest">No Image</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-brand-800 text-xs font-bold px-4 py-2 rounded-xl shadow-lg border-2 border-accent/30 uppercase tracking-widest flex items-center gap-2">
                                                    <span className="material-icons-outlined text-sm text-accent">verified</span>
                                                    Verified
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-6 flex-1 flex flex-col">
                                                <h3 className="font-bold text-brand-800 text-lg mb-2 leading-snug group-hover:text-accent transition-colors truncate">{item.title}</h3>
                                                <div className="h-0.5 w-12 bg-accent/50 rounded-full mb-4"></div>
                                                <p className="text-brand-500 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">{item.description}</p>

                                                <button
                                                    onClick={() => alert('Quote request sent to vendor via The Archive!')}
                                                    className="w-full bg-gradient-to-r from-brand-900 to-brand-800 hover:from-brand-800 hover:to-brand-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl text-sm uppercase tracking-wider group-hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-icons-outlined text-lg">request_quote</span>
                                                    Request Quote
                                                </button>
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
                            <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-brand-200">
                                <div className="p-4 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl text-primary-700 shadow-lg border-2 border-primary-200">
                                    <span className="material-icons-outlined text-3xl">travel_explore</span>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold font-serif text-brand-900 leading-tight">Global Suppliers</h2>
                                    <p className="text-brand-500 text-sm font-semibold tracking-wide uppercase">Top International Brands & Manufacturers</p>
                                </div>
                            </div>

                            {results.web_vendors.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {results.web_vendors.map((item, idx) => (
                                        <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-brand-100 hover:border-primary-300 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:from-primary-600 group-hover:to-primary-700 group-hover:text-white transition-all shadow-lg">
                                                    <span className="material-icons-outlined text-2xl">business</span>
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-widest text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200">Global</span>
                                            </div>

                                            <h3 className="font-bold text-brand-800 text-lg mb-2">{item.title}</h3>
                                            <p className="text-brand-500 text-sm mb-6 flex-grow">{item.description}</p>

                                            <button
                                                onClick={() => alert('Vendor saved to your dashboard!')}
                                                className="mt-auto text-primary-600 text-sm font-bold flex items-center gap-2 hover:gap-4 transition-all group-hover:text-primary-700"
                                            >
                                                <span className="material-icons-outlined text-lg">bookmark_add</span>
                                                Save Vendor
                                            </button>
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
                            <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-brand-200">
                                <div className="p-4 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl text-accent-dark shadow-lg border-2 border-accent/30">
                                    <span className="material-icons-outlined text-3xl">public</span>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold font-serif text-brand-900 leading-tight">Global Ideas</h2>
                                    <p className="text-brand-500 text-sm font-semibold tracking-wide uppercase">Trending Online Suggestions</p>
                                </div>
                            </div>

                            {results.web_products.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {results.web_products.map((item, idx) => (
                                        <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border-2 border-brand-100 p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full relative overflow-hidden group hover:border-accent/40">
                                            {/* Accent Bar */}
                                            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-accent via-accent-dark to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

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
                                                    <button
                                                        onClick={() => alert('Item added to shortlist!')}
                                                        className="text-accent hover:text-orange-700 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all group-hover:translate-x-1 uppercase tracking-wider text-[10px]"
                                                    >
                                                        <span className="material-icons-outlined text-sm">playlist_add</span>
                                                        Add to Shortlist
                                                    </button>
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
