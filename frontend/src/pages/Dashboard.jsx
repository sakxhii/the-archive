
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

const Dashboard = () => {
    const [frontFile, setFrontFile] = useState(null);
    const [backFile, setBackFile] = useState(null);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingStep, setProcessingStep] = useState('idle'); // idle, extracting, reviewing, saving
    const [uploadStatus, setUploadStatus] = useState('');
    const [statusType, setStatusType] = useState('info');

    const normalizePricing = (data) => {
        if (Array.isArray(data)) return data;
        if (typeof data === 'string' && data.length > 0 && !data.startsWith('Failed') && !data.startsWith('Error')) {
            return [{ item: data, price: '' }];
        }
        return [];
    };

    const addPricingItem = () => {
        setFormData(prev => ({
            ...prev,
            pricing_guide: [...(prev.pricing_guide || []), { item: '', price: '' }]
        }));
    };

    const removePricingItem = (index) => {
        setFormData(prev => ({
            ...prev,
            pricing_guide: prev.pricing_guide.filter((_, i) => i !== index)
        }));
    };

    const updatePricingItem = (index, field, value) => {
        const newItems = [...(formData.pricing_guide || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, pricing_guide: newItems }));
    };

    // Review Modal State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'General',
        website: '',
        phone: '',
        email: '',
        address: '',
        products: '',
        scrape_status: '',
        tagline: '',
        social_media: '',
        designation: '',
        pricing_guide: [],
        image_path: ''
    });

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/cards`);
            setCards(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleFrontChange = (e) => {
        setFrontFile(e.target.files[0]);
        setUploadStatus('');
    };

    const handleBackChange = (e) => {
        setBackFile(e.target.files[0]);
        setUploadStatus('');
    };

    const handleAnalyze = async () => {
        if (!frontFile) return;
        setLoading(true);
        setProcessingStep('extracting');
        setUploadStatus('Starting process...');
        setStatusType('info');

        const requestId = Date.now().toString();
        const data = new FormData();
        data.append('front', frontFile);
        if (backFile) {
            data.append('back', backFile);
        }
        data.append('request_id', requestId);

        // Start listening to status stream
        const eventSource = new EventSource(`${API_BASE_URL}/status-stream/${requestId}`);

        eventSource.onopen = () => {
            console.log("Status stream connected");
        };

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (parsed.status) {
                    setUploadStatus(parsed.status);
                    if (parsed.status.startsWith("Error")) {
                        setStatusType('error');
                    }
                }
            } catch (e) {
                // ignore keep-alive or parse errors
            }
        };

        eventSource.onerror = (err) => {
            // Optional: log or handle stream errors
            console.log("Stream closed or error", err);
            eventSource.close();
        };

        try {
            const res = await axios.post(`${API_BASE_URL}/analyze-card`, data);

            // Close stream on success
            eventSource.close();

            // Prepare form data from response
            const raw = res.data;
            const contactParts = raw.contact ? raw.contact.split(' | ') : [];
            let phone = '', email = '', address = '';

            contactParts.forEach(part => {
                if (part.startsWith('Ph: ')) phone = part.replace('Ph: ', '');
                else if (part.startsWith('✉ ')) email = part.replace('✉ ', '');
                else if (part.startsWith('📍 ')) address = part.replace('📍 ', '');
            });

            setFormData({
                name: raw.name || '',
                category: raw.category || 'General',
                website: raw.website || '',
                phone: phone,
                email: email,
                address: address,
                products: raw.products || '',
                scrape_status: raw.scrape_status || '',
                tagline: raw.additional_info?.tagline || '',
                social_media: raw.additional_info?.social_media || '',
                designation: raw.additional_info?.designation || '',
                pricing_guide: normalizePricing(raw.additional_info?.pricing_guide),
                image_path: raw.image_path
            });

            setProcessingStep('reviewing');
            setShowReviewModal(true);
            setUploadStatus('Analysis Complete. Please review below.');
        } catch (err) {
            console.error(err);
            setUploadStatus('Failed to process image.');
            setStatusType('error');
            setProcessingStep('idle');
            eventSource.close();
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = (card) => {
        // Parse contact info back to fields
        const contactParts = card.contact ? card.contact.split(' | ') : [];
        let phone = '', email = '', address = '';

        contactParts.forEach(part => {
            if (part.startsWith('Ph: ')) phone = part.replace('Ph: ', '');
            else if (part.startsWith('✉ ')) email = part.replace('✉ ', '');
            else if (part.startsWith('📍 ')) address = part.replace('📍 ', '');
        });

        const products = card.additional_info?.products_sold || '';

        setFormData({
            id: card.id,
            name: card.name,
            category: card.category,
            website: card.website,
            phone: phone,
            email: email,
            address: address,
            products: products,
            tagline: card.additional_info?.tagline || '',
            social_media: card.additional_info?.social_media || '',
            designation: card.additional_info?.designation || '',
            pricing_guide: normalizePricing(card.additional_info?.pricing_guide),
            image_path: card.image_path
        });
        setUploadStatus('');
        setLoading(false);
        setShowReviewModal(true);
    };

    const handleSaveVendor = async () => {
        setLoading(true);
        setProcessingStep('saving');

        try {
            // Reconstruct schema for backend
            const contactParts = [];
            if (formData.phone) contactParts.push(`Ph: ${formData.phone}`);
            if (formData.email) contactParts.push(`✉ ${formData.email}`);
            if (formData.address) contactParts.push(`📍 ${formData.address}`);

            const payload = {
                name: formData.name,
                category: formData.category,
                website: formData.website,
                contact: contactParts.join(' | '),
                products: formData.products,
                image_path: formData.image_path,
                additional_info: {
                    tagline: formData.tagline,
                    social_media: formData.social_media,
                    designation: formData.designation,
                    pricing_guide: formData.pricing_guide
                }
            };

            if (formData.id) {
                // Update existing
                await axios.put(`${API_BASE_URL}/update-vendor/${formData.id}`, payload);
                setUploadStatus('Vendor updated successfully.');
            } else {
                // Create new
                await axios.post(`${API_BASE_URL}/save-vendor`, payload);
                setUploadStatus('Entry created successfully.');
            }
            setStatusType('success');
            setShowReviewModal(false);
            setFrontFile(null);
            setBackFile(null);
            fetchCards();
            setProcessingStep('idle');
            setLoading(false);
        } catch (err) {
            console.error(err);
            setUploadStatus('Failed to save vendor.');
            setLoading(false);
            setStatusType('error');
        }
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteVendor = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!formData.id) return;

        try {
            await axios.delete(`${API_BASE_URL}/delete-vendor/${formData.id}`);
            // Remove from list
            setCards(cards.filter(c => c.id !== formData.id));
            setShowDeleteConfirm(false); // Close confirm modal
            setShowReviewModal(false);   // Close main modal
            setUploadStatus('Vendor deleted.');
        } catch (error) {
            console.error("Error deleting vendor:", error);
            setUploadStatus('Failed to delete vendor.');
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');

    const filteredCards = cards.filter(card => {
        const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.additional_info?.products_sold?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || card.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const uniqueCategories = ['All', ...new Set(cards.map(card => card.category))];

    const handleExportCSV = () => {
        const headers = ["Name,Category,Phone,Email,Address,Website,Products"];
        const rows = filteredCards.map(card => {
            const contact = card.contact || "";
            let phone = "", email = "", address = "";
            contact.split(' | ').forEach(part => {
                if (part.startsWith('Ph: ')) phone = part.replace('Ph: ', '');
                else if (part.startsWith('✉ ')) email = part.replace('✉ ', '');
                else if (part.startsWith('📍 ')) address = part.replace('📍 ', '');
            });
            const products = (card.additional_info?.products_sold || "").replace(/,/g, ';'); // Escape commas

            return [
                `"${card.name}"`,
                `"${card.category}"`,
                `"${phone}"`,
                `"${email}"`,
                `"${address}"`,
                `"${card.website || ''}"`,
                `"${products}"`
            ].join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "storytellerz_vendors.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen pt-10 pb-16 bg-gradient-to-br from-brand-50 via-white to-primary-50/30">
            {/* Hero Header with Gradient */}
            <div className="relative bg-gradient-to-r from-brand-900 via-brand-800 to-primary-900 text-white overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto max-w-7xl px-6 py-12 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-white/20">
                                <span className="material-icons-outlined text-accent text-sm">business_center</span>
                                <span className="text-xs font-bold uppercase tracking-wider">Vendor Management</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-3 leading-tight">
                                The Archive Manager
                            </h1>
                            <p className="text-xl text-brand-100 font-light max-w-2xl leading-relaxed">
                                Digitize your rolodex and transform business cards into lasting relationships.
                            </p>
                        </div>

                        {/* Stats Cards */}
                        <div className="flex gap-4">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-5 rounded-2xl shadow-xl hover:bg-white/15 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-dark rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="material-icons-outlined text-white text-2xl">contacts</span>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-serif font-bold">{cards.length}</div>
                                        <div className="text-xs font-bold text-brand-100 uppercase tracking-widest">Total Vendors</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-7xl px-6 -mt-8 relative z-20">
                {/* Filters & Actions - Elevated Card */}
                <div className="bg-white rounded-2xl shadow-2xl border border-brand-100 p-6 mb-8 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex gap-4 w-full md:w-auto flex-1">
                            {/* Search Input */}
                            <div className="relative flex-1 md:max-w-md group">
                                <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-brand-400 group-focus-within:text-accent transition-colors">search</span>
                                <input
                                    type="text"
                                    placeholder="Search vendors by name or products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-brand-200 focus:border-accent focus:ring-4 focus:ring-accent/10 text-brand-800 bg-brand-50/50 transition-all placeholder:text-brand-400"
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="relative group">
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="appearance-none pl-4 pr-12 py-3.5 rounded-xl border-2 border-brand-200 focus:border-accent focus:ring-4 focus:ring-accent/10 text-brand-800 bg-brand-50/50 font-semibold cursor-pointer hover:bg-brand-100 transition-all"
                                >
                                    {uniqueCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <span className="material-icons-outlined absolute right-4 top-1/2 -translate-y-1/2 text-brand-500 pointer-events-none group-focus-within:text-accent transition-colors">tune</span>
                            </div>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-700 hover:to-brand-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span className="material-icons-outlined">file_download</span>
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Upload Sidebar - Enhanced */}
                    <div className="lg:col-span-4 xl:col-span-3">
                        <div className="bg-gradient-to-br from-white to-brand-50/50 rounded-2xl shadow-xl border border-brand-200 p-8 sticky top-24 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-brand-200">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg">
                                    <span className="material-icons-outlined text-white text-xl">add_business</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-brand-900 font-serif leading-tight">Add New Vendor</h2>
                                    <p className="text-xs text-brand-500 font-medium">Upload business card</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Front Side */}
                                <div>
                                    <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-2">Front Side *</label>
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 group ${frontFile ? 'border-accent bg-accent/5' : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50'}`}>
                                        <input type="file" accept="image/*" onChange={handleFrontChange} id="front-upload" className="hidden" />
                                        <label htmlFor="front-upload" className="cursor-pointer flex flex-col items-center justify-center h-full">
                                            {frontFile ? (
                                                <>
                                                    <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mb-2 mx-auto">
                                                        <span className="material-icons-outlined text-2xl text-accent">image</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-brand-700 truncate max-w-[150px] mx-auto">{frontFile.name}</p>
                                                    <p className="text-[10px] text-accent mt-1 font-medium">Click to replace</p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                                                        <span className="material-icons-outlined text-2xl text-brand-300 group-hover:text-brand-500">crop_original</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-brand-600">Upload Front</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Back Side */}
                                <div>
                                    <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-2">Back Side (Optional)</label>
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 group ${backFile ? 'border-accent bg-accent/5' : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50'}`}>
                                        <input type="file" accept="image/*" onChange={handleBackChange} id="back-upload" className="hidden" />
                                        <label htmlFor="back-upload" className="cursor-pointer flex flex-col items-center justify-center h-full">
                                            {backFile ? (
                                                <>
                                                    <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mb-2 mx-auto">
                                                        <span className="material-icons-outlined text-2xl text-accent">flip</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-brand-700 truncate max-w-[150px] mx-auto">{backFile.name}</p>
                                                    <p className="text-[10px] text-accent mt-1 font-medium">Click to replace</p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform">
                                                        <span className="material-icons-outlined text-2xl text-brand-300 group-hover:text-brand-500">flip</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-brand-600">Upload Back</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={!frontFile || loading}
                                className={`w-full mt-8 py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${!frontFile || loading
                                    ? 'bg-brand-200 text-brand-400 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-r from-brand-900 to-brand-800 text-white hover:from-brand-800 hover:to-brand-700 hover:shadow-2xl hover:-translate-y-0.5'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-outlined">auto_awesome</span>
                                        Extract Data
                                    </>
                                )}
                            </button>

                            {uploadStatus && !showReviewModal && (
                                <div className={`mt-6 p-5 rounded-2xl text-sm border-2 flex items-start gap-3 animate-fade-in-up shadow-lg ${statusType === 'success' ? 'bg-gradient-to-br from-green-50 to-emerald-50 text-green-800 border-green-200' :
                                    statusType === 'error' ? 'bg-gradient-to-br from-red-50 to-rose-50 text-red-800 border-red-200' :
                                        'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-800 border-blue-200'
                                    }`}>
                                    <span className="material-icons-outlined text-xl">
                                        {statusType === 'success' ? 'check_circle' : statusType === 'error' ? 'error_outline' : 'info'}
                                    </span>
                                    <span className="font-semibold mt-0.5 leading-relaxed">{uploadStatus}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table / List Section */}
                    <div className="lg:col-span-8 xl:col-span-9">
                        <div className="space-y-4">
                            {/* List Header */}
                            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-50/50 rounded-xl border border-transparent">
                                <div className="col-span-1 text-center">Card</div>
                                <div className="col-span-4">Business Details</div>
                                <div className="col-span-2">Category</div>
                                <div className="col-span-4">Contact & Link</div>
                                <div className="col-span-1 text-center"></div>
                            </div>

                            {/* Cards List */}
                            <div className="space-y-4">
                                {filteredCards.map(card => (
                                    <div
                                        key={card.id}
                                        onClick={() => handleCardClick(card)}
                                        className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-brand-100 shadow-md hover:shadow-2xl hover:border-accent/30 transition-all duration-300 cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative overflow-hidden hover:-translate-y-1"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-accent via-accent-dark to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                        {/* Image */}
                                        <div className="col-span-1 md:col-span-1 flex justify-center md:justify-center">
                                            <div className="h-14 w-20 bg-brand-50 rounded-lg overflow-hidden border border-brand-100 relative items-center justify-center flex shadow-inner">
                                                {card.image_path && card.image_path !== 'None' && card.image_path !== 'null' ? (
                                                    <img
                                                        src={`${API_BASE_URL}/${card.image_path}`}
                                                        alt="Scan"
                                                        className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-brand-50'); }}
                                                    />
                                                ) : (
                                                    <span className="material-icons-outlined text-xl text-brand-300">image_not_supported</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Business Info */}
                                        <div className="col-span-1 md:col-span-4 text-center md:text-left">
                                            <h4 className="font-bold text-brand-900 text-lg font-serif mb-1 group-hover:text-accent transition-colors truncate">{card.name}</h4>
                                            {card.additional_info?.tagline ? (
                                                <p className="text-sm text-brand-500 italic line-clamp-1 opacity-80">{card.additional_info.tagline}</p>
                                            ) : (
                                                <p className="text-xs text-brand-300 line-clamp-1 italic">
                                                    {card.additional_info?.products_sold || card.additional_info?.designation || Object.values(card.additional_info || {}).slice(0, 3).join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Category */}
                                        <div className="col-span-1 md:col-span-2 flex justify-center md:justify-start">
                                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600 border border-brand-200 uppercase tracking-wider truncate max-w-full">
                                                {card.category}
                                            </span>
                                        </div>

                                        {/* Contact & Link */}
                                        <div className="col-span-1 md:col-span-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex flex-col gap-1.5 min-w-0 w-full md:w-auto">
                                                {card.contact && card.contact.split('|').slice(0, 2).map((part, i) => {
                                                    let icon = 'horizontal_rule';
                                                    let text = part.trim();
                                                    if (part.includes('Ph:')) { icon = 'call'; text = part.replace('Ph:', '').trim(); }
                                                    else if (part.includes('✉')) { icon = 'email'; text = part.replace('✉', '').trim(); }
                                                    else if (part.includes('📍')) { icon = 'place'; text = part.replace('📍', '').trim(); }

                                                    return (
                                                        <div key={i} className="flex items-center gap-2 text-xs text-brand-500 justify-center md:justify-start">
                                                            <span className="material-icons-outlined text-[12px] text-brand-300">{icon}</span>
                                                            <span className="truncate max-w-[180px]">{text}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Link Button */}
                                            {card.website ? (
                                                <a
                                                    href={card.website.startsWith('http') ? card.website : `https://${card.website}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-9 h-9 rounded-full bg-brand-50 hover:bg-accent hover:text-white flex items-center justify-center text-brand-400 transition-all flex-shrink-0 group/link border border-transparent hover:border-accent hover:shadow-lg hover:-translate-y-0.5"
                                                >
                                                    <span className="material-icons-outlined text-sm group-hover/link:rotate-45 transition-transform">launch</span>
                                                </a>
                                            ) : (
                                                <div className="w-9 h-9"></div>
                                            )}
                                        </div>

                                        <div className="hidden md:flex col-span-1 justify-end">
                                            <span className="material-icons-outlined text-brand-200 group-hover:text-accent transition-colors text-xl transform group-hover:translate-x-1 duration-300">chevron_right</span>
                                        </div>
                                    </div>
                                ))}

                                {filteredCards.length === 0 && (
                                    <div className="p-16 text-center bg-white rounded-2xl border border-brand-100 border-dashed">
                                        <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                            <span className="material-icons-outlined text-4xl text-brand-300">filter_list_off</span>
                                        </div>
                                        <h3 className="text-xl font-serif font-bold text-brand-800 mb-2">No Vendors Found</h3>
                                        <p className="text-brand-400">Try adjusting your search filters.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Review Modal */}
                {showReviewModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row">

                            {/* Image Preview Side */}
                            <div className="md:w-1/3 bg-brand-50 p-6 flex flex-col items-center justify-center border-r border-brand-100">
                                <h3 className="text-brand-800 font-serif font-bold mb-4">Original Scan</h3>
                                <div className="rounded-xl overflow-hidden shadow-lg border border-brand-200 w-full">
                                    <img
                                        src={`${API_BASE_URL}/${formData.image_path}`}
                                        alt="Scan Preview"
                                        className="w-full h-auto object-contain"
                                    />
                                </div>
                            </div>

                            {/* Form Side */}
                            <div className="md:w-2/3 p-8 overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-serif font-bold text-brand-900">Review & Edit Details</h2>
                                    <button
                                        onClick={() => setShowReviewModal(false)}
                                        className="text-brand-400 hover:text-brand-600"
                                    >
                                        <span className="material-icons-outlined">close</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2 border-b border-brand-100 pb-2 mb-2">
                                        <p className="text-brand-400 text-xs font-bold mb-2 uppercase">Business Information</p>
                                    </div>

                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Business Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-3 bg-brand-50 border border-brand-200 rounded-lg focus:outline-none focus:border-accent font-serif font-bold text-brand-800 placeholder-brand-300"
                                            placeholder="e.g. Acme Corp"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 placeholder-brand-300"
                                            placeholder="e.g. Catering, Logistics"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Designation</label>
                                        <input
                                            type="text"
                                            value={formData.designation}
                                            onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 placeholder-brand-300"
                                            placeholder="e.g. Manager"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Website</label>
                                        <input
                                            type="text"
                                            value={formData.website}
                                            onChange={e => setFormData({ ...formData, website: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 placeholder-brand-300 font-mono text-sm"
                                            placeholder="www.example.com"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Tagline</label>
                                        <input
                                            type="text"
                                            value={formData.tagline}
                                            onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 placeholder-brand-300 italic"
                                            placeholder="e.g. Quality you can trust..."
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Products & Services Offered</label>
                                        <textarea
                                            value={formData.products}
                                            onChange={e => setFormData({ ...formData, products: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 h-24 placeholder-brand-300"
                                            placeholder="List the key items or services this vendor provides..."
                                        />
                                    </div>

                                    <div className="col-span-2 border-b border-brand-100 pb-2 mb-2 mt-2">
                                        <p className="text-brand-400 text-xs font-bold mb-2 uppercase">Contact Information</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Phone Numbers</label>
                                        <div className="space-y-2">
                                            {formData.phone.split(',').map((p, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        value={p.trim()}
                                                        onChange={e => {
                                                            const parts = formData.phone.split(',');
                                                            parts[i] = e.target.value;
                                                            setFormData({ ...formData, phone: parts.join(',') });
                                                        }}
                                                        className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700"
                                                        placeholder="+91..."
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const parts = formData.phone.split(',');
                                                            parts.splice(i, 1);
                                                            setFormData({ ...formData, phone: parts.join(',') });
                                                        }}
                                                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remove"
                                                    >
                                                        <span className="material-icons-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setFormData({ ...formData, phone: formData.phone + (formData.phone ? ', ' : '') + '' })}
                                                className="text-xs font-bold text-accent hover:text-accent/80 flex items-center gap-1 mt-1"
                                            >
                                                <span className="material-icons-outlined text-sm">add</span>
                                                Add Phone
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Email Addresses</label>
                                        <div className="space-y-2">
                                            {formData.email.split(',').map((email, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <input
                                                        type="email"
                                                        value={email.trim()}
                                                        onChange={e => {
                                                            const parts = formData.email.split(',');
                                                            parts[i] = e.target.value;
                                                            setFormData({ ...formData, email: parts.join(',') });
                                                        }}
                                                        className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700"
                                                        placeholder="name@example.com"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const parts = formData.email.split(',');
                                                            parts.splice(i, 1);
                                                            setFormData({ ...formData, email: parts.join(',') });
                                                        }}
                                                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remove"
                                                    >
                                                        <span className="material-icons-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setFormData({ ...formData, email: formData.email + (formData.email ? ', ' : '') + '' })}
                                                className="text-xs font-bold text-accent hover:text-accent/80 flex items-center gap-1 mt-1"
                                            >
                                                <span className="material-icons-outlined text-sm">add</span>
                                                Add Email
                                            </button>
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Address</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 placeholder-brand-300"
                                            placeholder="e.g. 123 Business Park, New Delhi"
                                        />
                                    </div>

                                    <div className="col-span-2 border-b border-brand-100 pb-2 mb-2 mt-2">
                                        <p className="text-brand-400 text-xs font-bold mb-2 uppercase">Additional Details & Branding</p>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest">Pricing Guide (Scraped)</label>
                                            {formData.scrape_status && formData.scrape_status !== 'success' && (
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${formData.scrape_status.includes('no_website') ? 'bg-gray-100 text-gray-500' :
                                                    formData.scrape_status.includes('no_data') ? 'bg-orange-100 text-orange-600' :
                                                        'bg-red-50 text-red-500'
                                                    }`}>
                                                    {formData.scrape_status === 'no_website' ? 'No Website Detected' :
                                                        formData.scrape_status === 'no_data_found' ? 'No Prices Found' :
                                                            'Site Unreachable'}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {(formData.pricing_guide || []).map((item, index) => (
                                                <div key={index} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        value={item.item || ''}
                                                        onChange={(e) => updatePricingItem(index, 'item', e.target.value)}
                                                        className="flex-1 p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 placeholder-brand-300"
                                                        placeholder="Item Name"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={item.price || ''}
                                                        onChange={(e) => updatePricingItem(index, 'price', e.target.value)}
                                                        className="w-1/3 p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 placeholder-brand-300"
                                                        placeholder="Price"
                                                    />
                                                    <button
                                                        onClick={() => removePricingItem(index)}
                                                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remove Item"
                                                    >
                                                        <span className="material-icons-outlined">delete</span>
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                onClick={addPricingItem}
                                                className="text-xs font-bold text-accent hover:text-accent/80 flex items-center gap-1 mt-1"
                                            >
                                                <span className="material-icons-outlined text-sm">add_circle</span>
                                                Add Price Item
                                            </button>
                                        </div>

                                        {formData.scrape_status && formData.scrape_status !== 'success' && formData.scrape_status !== 'no_website' && (
                                            <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3 animate-fade-in shadow-sm">
                                                <span className="material-icons-outlined text-orange-400 text-xl mt-0.5">info</span>
                                                <div>
                                                    <p className="text-sm font-bold text-orange-800">We couldn't read prices automatically</p>
                                                    <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                                                        The website might be blocking us or structured differently. Please verify the link or add product details manually.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Social Media Handles</label>
                                        <input
                                            type="text"
                                            value={formData.social_media}
                                            onChange={e => setFormData({ ...formData, social_media: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 placeholder-brand-300"
                                            placeholder="e.g. @storytellerz (Instagram), /storytellerz (LinkedIn)"
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-between items-center border-t border-brand-100 pt-6">
                                    {formData.id ? (
                                        <button
                                            onClick={handleDeleteVendor}
                                            className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-2 transition-colors px-4 py-2 hover:bg-red-50 rounded-lg group"
                                        >
                                            <span className="material-icons-outlined text-lg group-hover:scale-110 transition-transform">delete_outline</span>
                                            Delete Vendor
                                        </button>
                                    ) : (
                                        <div></div>
                                    )}
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setShowReviewModal(false)}
                                            className="px-6 py-3 font-bold text-brand-500 hover:text-brand-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveVendor}
                                            disabled={loading}
                                            className="px-8 py-3 bg-accent text-white font-bold rounded-xl shadow-lg hover:bg-accent/90 hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-2"
                                        >
                                            {loading ? 'Saving...' : 'Save Vendor'}
                                            {!loading && <span className="material-icons-outlined text-sm">check</span>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-brand-900/40 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-brand-100 animate-in fade-in zoom-in duration-200">
                            <h3 className="text-xl font-bold text-brand-900 mb-2">Delete Vendor?</h3>

                            <p className="text-brand-600 text-sm mb-6">
                                Permanently remove <span className="font-bold">{formData.name}</span>? This cannot be undone.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 text-sm font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm hover:shadow transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
