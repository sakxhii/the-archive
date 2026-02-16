import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

const CustomerSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ internal: [], web_products: [], web_vendors: [], market_insights: null });
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Shortlist & Notification State
    const [shortlist, setShortlist] = useState([]);
    const [showShortlist, setShowShortlist] = useState(false);
    const [notification, setNotification] = useState(null);
    const [selectedVendor, setSelectedVendor] = useState(null);

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleAddToShortlist = (item, type) => {
        setShortlist(prev => [...prev, { ...item, type, addedAt: new Date() }]);
        showToast(`${item.title || item.name} added to shortlist!`, 'success');
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        console.log("Searching for:", query);
        if (!query.trim()) return;

        setLoading(true);
        showToast("Initiating Search...", "info");

        try {
            const res = await axios.post(`${API_BASE_URL}/search-gifts`, { query });
            console.log("Search API Response:", res.data);

            const count = (res.data.internal_results?.length || 0) + (res.data.web_products?.length || 0) + (res.data.web_vendors?.length || 0);
            showToast(`Search completed. Found ${count} items.`, "success");

            if (res.data.internal_results?.length === 0 && res.data.web_products?.length === 0 && res.data.web_vendors?.length === 0) {
                console.warn("No results found in any category.");
            }

            setResults({
                internal: res.data.internal_results || [],
                web_products: res.data.web_products || [],
                web_vendors: res.data.web_vendors || [],
                market_insights: res.data.market_insights || null
            });
            setSearched(true);
        } catch (err) {
            console.error("Search Failed:", err);
            if (err.response) {
                console.error("Server Error Details:", err.response.data);
                showToast(`Search failed: ${err.response.data.detail || "Unknown server error"}`, 'error');
            } else {
                showToast("Search failed. Please check your connection.", 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bg-gradient-to-br from-brand-50 via-white to-primary-50/30 pt-10 ${searched ? 'min-h-screen' : 'h-screen overflow-hidden'}`}>

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-fade-in-up border-l-4 ${notification.type === 'error' ? 'bg-white border-red-500 text-red-600' : 'bg-brand-900 border-accent text-white'
                    }`}>
                    <span className="material-icons-outlined">
                        {notification.type === 'error' ? 'error_outline' : 'check_circle'}
                    </span>
                    <p className="font-bold text-sm">{notification.message}</p>
                </div>
            )}

            {/* Shortlist Floating Button */}
            {searched && (
                <button
                    onClick={() => setShowShortlist(true)}
                    className="fixed bottom-8 right-8 z-40 bg-brand-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 flex items-center justify-center group"
                >
                    <span className="material-icons-outlined text-2xl group-hover:animate-bounce">playlist_add_check</span>
                    {shortlist.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-accent text-brand-900 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-brand-900">
                            {shortlist.length}
                        </span>
                    )}
                </button>
            )}

            {/* Shortlist Sidebar (Drawer) */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${showShortlist ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 bg-brand-900 text-white flex justify-between items-center">
                        <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                            <span className="material-icons-outlined text-accent">playlist_add_check</span>
                            Your Shortlist
                        </h2>
                        <button onClick={() => setShowShortlist(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {shortlist.length === 0 ? (
                            <div className="text-center text-brand-300 mt-10">
                                <span className="material-icons-outlined text-4xl mb-2">playlist_remove</span>
                                <p>No items added yet.</p>
                            </div>
                        ) : (
                            shortlist.map((item, idx) => (
                                <div key={idx} className="bg-brand-50 rounded-xl p-4 border border-brand-100 flex gap-3 relative group">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold uppercase text-brand-400 mb-1">{item.type}</p>
                                        <h4 className="font-bold text-brand-800 text-sm leading-tight">{item.title || item.name}</h4>
                                        {item.price && <span className="text-accent text-xs font-bold mt-1 block">{item.price}</span>}
                                    </div>
                                    <button
                                        onClick={() => setShortlist(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-brand-300 hover:text-red-500 self-start"
                                    >
                                        <span className="material-icons-outlined text-sm">close</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 border-t border-brand-100 bg-brand-50">
                        <button
                            onClick={() => { showToast('List exported to PDF!', 'success'); setShowShortlist(false); }}
                            className="w-full bg-brand-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-brand-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-icons-outlined">download</span>
                            Export Shortlist
                        </button>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className={`relative transition-all duration-700 ${searched ? 'py-20' : 'min-h-[calc(100vh-5rem)] flex items-center'} bg-gradient-to-br from-brand-900 via-brand-800 to-primary-900 flex flex-col justify-center overflow-hidden`}>
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 -right-10 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="container mx-auto px-6 z-10 text-center xl:px-32">
                    <h1 className={`font-serif font-bold text-white mb-6 transition-all duration-700 ${searched ? 'text-4xl' : 'text-5xl md:text-7xl leading-tight'}`}>
                        {searched ? 'Curated Gift Selection' : 'Find the Perfect Corporate Gift'}
                    </h1>

                    {!searched && (
                        <p className="text-brand-100 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                            Search across our verified artisan network and global premium suppliers instantly.
                        </p>
                    )}

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className={`relative max-w-3xl mx-auto transition-all duration-500 ${searched ? 'scale-90' : 'scale-100'}`}>
                        <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2">
                            <div className="flex-1 bg-white rounded-xl flex items-center px-6 py-4 shadow-inner">
                                <span className="material-icons-outlined text-brand-300 text-2xl mr-4">search</span>
                                <input
                                    type="text"
                                    placeholder="e.g. 'Eco-friendly desk organizers', 'Luxury leather journals'..."
                                    className="w-full bg-transparent border-none outline-none text-brand-800 placeholder-brand-300 font-medium text-lg"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-accent hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-accent/50 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin material-icons-outlined text-xl">autorenew</span>
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
                        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium mt-8">
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

                        {/* Market Pulse Section */}
                        {results.market_insights && (
                            <div className="bg-brand-900 text-white rounded-3xl p-8 mb-16 shadow-2xl relative overflow-hidden animate-fade-in-up">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16"></div>

                                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                                <span className="material-icons-outlined text-accent text-2xl">insights</span>
                                            </span>
                                            <h2 className="text-2xl font-serif font-bold">Market Pulse</h2>
                                        </div>
                                        <p className="text-brand-100 leading-relaxed text-sm lg:text-base border-l-2 border-accent pl-4">
                                            {results.market_insights.summary || "Real-time market analysis for your search query."}
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-8 lg:justify-center border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8">
                                        <div>
                                            <p className="text-brand-300 text-xs font-bold uppercase tracking-wider mb-2">Price Trend</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`material-icons-outlined text-3xl ${results.market_insights.price_trend?.toLowerCase().includes('rising') ? 'text-red-400' :
                                                    results.market_insights.price_trend?.toLowerCase().includes('falling') ? 'text-green-400' : 'text-blue-400'
                                                    }`}>
                                                    {results.market_insights.price_trend?.toLowerCase().includes('rising') ? 'trending_up' :
                                                        results.market_insights.price_trend?.toLowerCase().includes('falling') ? 'trending_down' : 'trending_flat'}
                                                </span>
                                                <span className="text-xl font-bold">{results.market_insights.price_trend || "Stable"}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-brand-300 text-xs font-bold uppercase tracking-wider mb-2">Avg. Range</p>
                                            <span className="text-xl font-bold font-mono bg-white/10 px-3 py-1 rounded-lg">{results.market_insights.average_price || "N/A"}</span>
                                        </div>
                                    </div>

                                    <div className="border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8">
                                        <p className="text-brand-300 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span className="material-icons-outlined text-sm">local_fire_department</span>
                                            Trending Now
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {results.market_insights.trending_keywords?.map((tag, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-white/10 to-white/5 hover:from-accent hover:to-orange-600 rounded-lg text-xs font-bold transition-all cursor-default border border-white/10 shadow-sm">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                                    onClick={() => showToast('Quote request sent to vendor via The Archive!', 'success')}
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
                                        <div key={idx} className="bg-white rounded-2xl p-6 border border-brand-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
                                            {/* Decorative top accent */}
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-200 to-transparent"></div>

                                            <div className="flex items-start justify-between mb-5">
                                                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shadow-inner">
                                                    <span className="material-icons-outlined text-2xl">business</span>
                                                </div>
                                                <span className="bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-1 rounded-md border border-primary-100 uppercase tracking-wider">
                                                    Global
                                                </span>
                                            </div>

                                            <h3 className="font-serif font-bold text-brand-900 text-xl mb-2 group-hover:text-primary-700 transition-colors">{item.title}</h3>
                                            <p className="text-brand-500 text-sm mb-8 leading-relaxed flex-grow">{item.description}</p>

                                            <div className="mt-auto space-y-3">
                                                <button
                                                    onClick={() => setSelectedVendor(item)}
                                                    className="w-full bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 group-hover:shadow-md active:scale-95"
                                                >
                                                    <span className="material-icons-outlined text-lg">storefront</span>
                                                    View Collection ({item.products?.length || 0})
                                                </button>
                                                <button
                                                    onClick={() => handleAddToShortlist(item, 'vendor')}
                                                    className="w-full text-brand-400 hover:text-brand-600 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors py-2"
                                                >
                                                    <span className="material-icons-outlined text-sm">bookmark_border</span>
                                                    Save Vendor
                                                </button>
                                            </div>
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
                                                        onClick={() => handleAddToShortlist(item, 'product')}
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

            {/* Vendor Collection Modal */}
            {selectedVendor && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-900/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.target === e.currentTarget && setSelectedVendor(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
                        {/* Header */}
                        <div className="p-6 border-b border-brand-100 flex justify-between items-center bg-brand-50/50">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary-100 text-primary-600 rounded-xl">
                                    <span className="material-icons-outlined text-2xl">store</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-brand-900">{selectedVendor.title}</h2>
                                    <p className="text-brand-500 text-sm max-w-lg">{selectedVendor.description}</p>
                                    <a href={selectedVendor.link} target="_blank" rel="noreferrer" className="text-accent text-xs font-bold hover:underline mt-1 inline-flex items-center gap-1">
                                        Visit Website <span className="material-icons-outlined text-[10px]">open_in_new</span>
                                    </a>
                                </div>
                            </div>
                            <button onClick={() => setSelectedVendor(null)} className="p-2 hover:bg-brand-100 rounded-full transition-colors text-brand-400 hover:text-brand-800">
                                <span className="material-icons-outlined text-2xl">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto bg-white flex-1 custom-scrollbar">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-brand-800 flex items-center gap-2 text-lg">
                                    <span className="material-icons-outlined text-accent">inventory_2</span>
                                    Featured Products
                                </h3>
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-300">{selectedVendor.products?.length || 0} ITEMS AVAILABLE</span>
                            </div>

                            {selectedVendor.products?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {selectedVendor.products.map((prod, i) => (
                                        <div key={i} className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 hover:border-primary-200 hover:shadow-lg hover:-translate-y-1 transition-all group duration-300">
                                            <div className="aspect-[4/3] bg-white rounded-xl mb-4 flex items-center justify-center text-brand-200 group-hover:text-primary-300 transition-colors relative overflow-hidden border border-brand-50">
                                                <span className="material-icons-outlined text-5xl">shopping_bag</span>
                                                {/* Mock Image Gradient Overlay if valid image existed */}
                                            </div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-brand-800 text-sm leading-tight flex-1 mr-2">{prod.title}</h4>
                                                <span className="bg-white border border-brand-100 text-brand-900 text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-sm font-mono">{prod.price}</span>
                                            </div>

                                            <button
                                                onClick={() => handleAddToShortlist({ ...prod, source: selectedVendor.title }, 'product')}
                                                className="mt-4 w-full bg-white border-2 border-brand-100 text-brand-500 hover:text-accent hover:border-accent/30 text-xs font-bold py-2.5 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 group-hover:shadow-sm"
                                            >
                                                <span className="material-icons-outlined text-sm">playlist_add</span>
                                                Add to List
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-brand-100 rounded-2xl bg-brand-50/30">
                                    <span className="material-icons-outlined text-5xl text-brand-200 mb-4">production_quantity_limits</span>
                                    <p className="text-brand-400 font-medium">No products listed for this vendor yet.</p>
                                    <button onClick={() => window.open(selectedVendor.link, '_blank')} className="mt-4 text-accent hover:underline text-sm font-bold">Check Website Directly</button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-brand-100 bg-brand-50 flex justify-end gap-3">
                            <button onClick={() => setSelectedVendor(null)} className="px-6 py-3 font-bold text-brand-500 hover:text-brand-800 transition-colors">Close</button>
                            <button onClick={() => { handleAddToShortlist(selectedVendor, 'vendor'); setSelectedVendor(null); }} className="px-6 py-3 bg-brand-900 text-white font-bold rounded-xl hover:bg-brand-800 transition-all shadow-lg flex items-center gap-2">
                                <span className="material-icons-outlined">bookmark</span>
                                Save Entire Vendor
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerSearch;
