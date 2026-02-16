
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
        image_path: '',
        supplier_type: 'Unknown',
        source_origin: ''
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
                image_path: raw.image_path,
                supplier_type: raw.additional_info?.supplier_type || 'Unknown',
                source_origin: raw.additional_info?.source_origin || ''
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
            image_path: card.image_path,
            supplier_type: card.additional_info?.supplier_type || 'Unknown',
            source_origin: card.additional_info?.source_origin || ''
        });
        setUploadStatus('');
        setLoading(false);
        setShowReviewModal(true);
    };

    const handleSaveVendor = async () => {
        console.log("handleSaveVendor called");
        if (!formData.name || !formData.name.trim()) {
            setUploadStatus('Business Name is required *');
            setStatusType('error');
            return;
        }

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
                    pricing_guide: formData.pricing_guide,
                    supplier_type: formData.supplier_type,
                    source_origin: formData.source_origin
                }
            };
            console.log("Saving payload:", payload);

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

            <div className="container mx-auto max-w-7xl px-6 relative z-20 pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sidebar - Upload & Actions */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                        {/* Search & Filter Card (Moved to sidebar for better layout query or keep on top? Let's keep a unified toolbar on top actually, but for this specific request, let's try a distinct layout: Sidebar has upload, Main area has list + toolbar) */}

                        {/* Actually, let's keep the layout: Toolbar on top of list. Sidebar on left. */}

                        {/* Upload Card */}
                        <div className="bg-white rounded-3xl shadow-xl shadow-brand-900/5 border border-white/50 overflow-hidden sticky top-28 backdrop-blur-xl">
                            <div className="p-8 bg-brand-900 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                                <h2 className="text-2xl font-serif font-bold flex items-center gap-3 relative z-10">
                                    <span className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20">
                                        <span className="material-icons-outlined text-xl">add</span>
                                    </span>
                                    Add Vendor
                                </h2>
                                <p className="text-brand-200 text-sm mt-3 ml-14 opacity-80 leading-relaxed">Upload business card scans to instantly extract and save vendor details.</p>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Front Side */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline">
                                        <label className="text-sm font-bold text-brand-600 uppercase tracking-wider">Front Side</label>
                                        <span className="text-[10px] text-accent font-bold px-2 py-0.5 bg-accent/10 rounded-full uppercase tracking-wider">Required</span>
                                    </div>
                                    <div className={`relative group transition-all duration-300 rounded-2xl border-2 border-dashed h-40 ${frontFile ? 'border-accent bg-accent/5' : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50/50'}`}>
                                        <input type="file" accept="image/*" onChange={handleFrontChange} id="front-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center pointer-events-none">
                                            {frontFile ? (
                                                <div className="animate-fade-in w-full">
                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 mx-auto text-accent">
                                                        <span className="material-icons-outlined text-2xl">check_circle</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-brand-800 truncate px-2">{frontFile.name}</p>
                                                    <p className="text-[10px] text-brand-400 mt-1 font-medium uppercase tracking-wide">Click to replace</p>
                                                </div>
                                            ) : (
                                                <div className="group-hover:transform group-hover:-translate-y-1 transition-transform duration-300">
                                                    <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mb-3 mx-auto text-brand-300 group-hover:text-brand-500 group-hover:bg-brand-100 transition-colors">
                                                        <span className="material-icons-outlined text-3xl">crop_original</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-brand-600">Upload Front Image</p>
                                                    <p className="text-[10px] text-brand-400 mt-1">Supports JPG, PNG</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Back Side */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline">
                                        <label className="text-sm font-bold text-brand-600 uppercase tracking-wider">Back Side</label>
                                        <span className="text-[10px] text-brand-400 font-bold px-2 py-0.5 bg-brand-100 rounded-full uppercase tracking-wider">Optional</span>
                                    </div>
                                    <div className={`relative group transition-all duration-300 rounded-2xl border-2 border-dashed h-40 ${backFile ? 'border-accent bg-accent/5' : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50/50'}`}>
                                        <input type="file" accept="image/*" onChange={handleBackChange} id="back-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center pointer-events-none">
                                            {backFile ? (
                                                <div className="animate-fade-in w-full">
                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 mx-auto text-accent">
                                                        <span className="material-icons-outlined text-2xl">check_circle</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-brand-800 truncate px-2">{backFile.name}</p>
                                                    <p className="text-[10px] text-brand-400 mt-1 font-medium uppercase tracking-wide">Click to replace</p>
                                                </div>
                                            ) : (
                                                <div className="group-hover:transform group-hover:-translate-y-1 transition-transform duration-300">
                                                    <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mb-3 mx-auto text-brand-300 group-hover:text-brand-500 group-hover:bg-brand-100 transition-colors">
                                                        <span className="material-icons-outlined text-3xl">flip</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-brand-600">Upload Back Image</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAnalyze}
                                    disabled={!frontFile || loading}
                                    className={`w-full py-5 rounded-xl font-bold text-sm tracking-wide uppercase transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg ${!frontFile || loading
                                        ? 'bg-brand-100 text-brand-300 cursor-not-allowed shadow-none border border-brand-200'
                                        : 'bg-brand-900 text-white hover:bg-brand-800 hover:shadow-brand-900/20'
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span className="text-base">Processing Scan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-base">Extract Data</span>
                                            <span className="material-icons-outlined text-xl">auto_awesome</span>
                                        </>
                                    )}
                                </button>

                                {uploadStatus && !showReviewModal && (
                                    <div className={`p-4 rounded-xl text-xs font-medium border flex items-start gap-3 animate-fade-in-up ${statusType === 'success' ? 'bg-green-50 text-green-800 border-green-100' :
                                        statusType === 'error' ? 'bg-red-50 text-red-800 border-red-100' :
                                            'bg-blue-50 text-blue-800 border-blue-100'
                                        }`}>
                                        <span className="material-icons-outlined text-sm mt-0.5">
                                            {statusType === 'success' ? 'check_circle' : statusType === 'error' ? 'error_outline' : 'info'}
                                        </span>
                                        <span className="leading-relaxed">{uploadStatus}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6">

                        {/* Unified Toolbar */}
                        <div className="bg-white p-2 rounded-2xl shadow-sm border border-brand-100 flex flex-col md:flex-row gap-2">
                            <div className="relative flex-1">
                                <span className="material-icons-outlined absolute left-4 top-3.5 text-brand-300">search</span>
                                <input
                                    type="text"
                                    placeholder="Search by name, products, or tags..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-transparent border-none focus:ring-2 focus:ring-brand-100 focus:bg-brand-50/50 text-brand-800 placeholder-brand-300 font-medium transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="relative min-w-[160px]">
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl bg-brand-50 border-none focus:ring-2 focus:ring-brand-100 text-brand-700 font-bold text-sm cursor-pointer hover:bg-brand-100 transition-colors h-full"
                                    >
                                        {uniqueCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <span className="material-icons-outlined absolute right-3 top-3.5 text-brand-400 pointer-events-none text-lg">expand_more</span>
                                </div>
                                <button
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-5 py-3 bg-brand-900 text-white font-bold text-sm rounded-xl hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/10 whitespace-nowrap"
                                >
                                    <span className="material-icons-outlined text-lg">download</span>
                                    <span>Export</span>
                                </button>
                            </div>
                        </div>
                        {/* List Header */}
                        <div className="hidden lg:grid grid-cols-12 gap-6 px-8 py-4 text-sm font-black text-brand-700 uppercase tracking-widest bg-white/60 rounded-2xl border border-brand-100 shadow-sm backdrop-blur-md sticky top-24 z-10">
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
                                    className="group bg-white rounded-2xl p-6 border border-brand-100 shadow-sm hover:shadow-xl hover:shadow-brand-900/5 hover:border-brand-200 transition-all duration-300 cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative overflow-hidden"
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

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
                                            <p className="text-xs text-brand-400 line-clamp-1 italic">
                                                {card.additional_info?.products_sold || card.additional_info?.designation || Object.values(card.additional_info || {}).slice(0, 3).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Category */}
                                    <div className="col-span-1 md:col-span-2 flex justify-center md:justify-start">
                                        <div className="flex flex-col gap-1 items-center md:items-start">
                                            <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600 border border-brand-200 uppercase tracking-wider group-hover:bg-brand-100 transition-colors whitespace-normal text-center leading-tight">
                                                {card.category}
                                            </span>
                                            {card.additional_info?.supplier_type && card.additional_info.supplier_type !== 'Unknown' && (
                                                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-accent/10 text-accent uppercase tracking-widest border border-accent/20">
                                                    {card.additional_info.supplier_type}
                                                </span>
                                            )}
                                        </div>
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
                                                        <span className="material-icons-outlined text-[13px] text-brand-300">{icon}</span>
                                                        <span className="truncate max-w-[180px] font-medium opacity-90">{text}</span>
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
                                                className="w-10 h-10 rounded-full bg-brand-50 hover:bg-accent hover:text-white flex items-center justify-center text-brand-400 transition-all flex-shrink-0 group/link border border-transparent hover:border-accent hover:shadow-lg hover:-translate-y-0.5"
                                            >
                                                <span className="material-icons-outlined text-lg group-hover/link:rotate-45 transition-transform">launch</span>
                                            </a>
                                        ) : (
                                            <div className="w-10 h-10"></div>
                                        )}
                                    </div>

                                    <div className="hidden md:flex col-span-1 justify-end pr-2">
                                        <span className="material-icons-outlined text-brand-200 group-hover:text-accent transition-all duration-300 text-2xl transform group-hover:translate-x-1">chevron_right</span>
                                    </div>
                                </div>
                            ))}

                            {filteredCards.length === 0 && (
                                <div className="p-20 text-center bg-white rounded-3xl border border-brand-100 border-dashed">
                                    <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                        <span className="material-icons-outlined text-4xl text-brand-300">filter_list_off</span>
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-brand-800 mb-2">No Vendors Found</h3>
                                    <p className="text-brand-400">Try adjusting your search terms or filters.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden border border-white/20">

                        {/* Left Side: Image Preview (Fixed) */}
                        <div className="hidden md:flex w-[40%] bg-brand-50/50 flex-col border-r border-brand-100 relative">
                            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

                            {/* Header */}
                            <div className="px-8 py-6 border-b border-brand-100 bg-white/50 backdrop-blur-sm flex justify-between items-center relative z-10">
                                <h3 className="text-brand-900 font-serif font-bold text-lg flex items-center gap-2">
                                    <span className="material-icons-outlined text-brand-400">image</span>
                                    Original Scan
                                </h3>
                                <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest bg-brand-100/50 px-2 py-1 rounded">
                                    Read Only
                                </div>
                            </div>

                            {/* Image Container */}
                            <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative z-10">
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white transition-transform hover:scale-105 duration-500 group">
                                    <img
                                        src={`${API_BASE_URL}/${formData.image_path}`}
                                        alt="Scan Preview"
                                        className="max-w-full h-auto object-contain"
                                    />
                                    <a
                                        href={`${API_BASE_URL}/${formData.image_path}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 cursor-pointer"
                                    >
                                        <span className="material-icons-outlined">zoom_in</span>
                                        View Full Size
                                    </a>
                                </div>
                            </div>

                            {/* Tip */}
                            <div className="px-8 py-4 bg-brand-100/30 text-center relative z-10">
                                <p className="text-xs text-brand-500">
                                    <span className="font-bold">Tip:</span> Verify details against this image.
                                </p>
                            </div>
                        </div>

                        {/* Right Side: Form (Scrollable) */}
                        <div className="flex-1 flex flex-col bg-white w-full md:w-[60%]">

                            {/* Modal Header */}
                            <div className="px-8 py-5 border-b border-brand-100 flex justify-between items-center bg-white z-20">
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-brand-900">Review Vendor Details</h2>
                                    <p className="text-sm text-brand-500">Ensure all information is correct before saving to the archive.</p>
                                </div>
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="w-10 h-10 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-500 hover:text-brand-900 flex items-center justify-center transition-all"
                                >
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>

                            {/* Scrollable Form Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                                {/* Section: Essential Info */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6 text-brand-400 uppercase tracking-widest text-xs font-bold border-b border-brand-50 pb-2">
                                        <span className="material-icons-outlined text-sm">business</span>
                                        Business Essentials
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Business Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full p-3.5 bg-brand-50/50 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-900 font-serif font-bold text-lg placeholder-brand-300 transition-all"
                                                placeholder="e.g. Acme Corp"
                                            />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Designation</label>
                                            <input
                                                type="text"
                                                value={formData.designation}
                                                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                                className="w-full p-3.5 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-medium placeholder-brand-300 transition-all"
                                                placeholder="e.g. Sales Manager"
                                            />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Category</label>
                                            <input
                                                type="text"
                                                value={formData.category}
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full p-3.5 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-medium placeholder-brand-300 transition-all"
                                                placeholder="e.g. Corporate Gifting"
                                            />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Website</label>
                                            <div className="relative">
                                                <span className="material-icons-outlined absolute left-3.5 top-3.5 text-brand-300 text-lg">language</span>
                                                <input
                                                    type="text"
                                                    value={formData.website}
                                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-mono text-sm placeholder-brand-300 transition-all"
                                                    placeholder="www.example.com"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Classification */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6 text-brand-400 uppercase tracking-widest text-xs font-bold border-b border-brand-50 pb-2">
                                        <span className="material-icons-outlined text-sm">category</span>
                                        Classification & Source
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Supplier Type</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.supplier_type}
                                                    onChange={e => setFormData({ ...formData, supplier_type: e.target.value })}
                                                    className="w-full p-3.5 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-medium appearance-none cursor-pointer hover:bg-brand-50/50 transition-colors"
                                                >
                                                    <option value="Unknown">Select Type...</option>
                                                    <option value="Manufacturer">Manufacturer</option>
                                                    <option value="Wholesaler">Wholesaler</option>
                                                    <option value="Retailer">Retailer</option>
                                                    <option value="Service Provider">Service Provider</option>
                                                    <option value="Artisan">Artisan/Creator</option>
                                                </select>
                                                <span className="material-icons-outlined absolute right-3.5 top-3.5 text-brand-400 pointer-events-none">expand_more</span>
                                            </div>
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Source / Origin</label>
                                            <div className="relative">
                                                <span className="material-icons-outlined absolute left-3.5 top-3.5 text-brand-300 text-lg">place</span>
                                                <input
                                                    type="text"
                                                    value={formData.source_origin}
                                                    onChange={e => setFormData({ ...formData, source_origin: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-medium placeholder-brand-300 transition-all"
                                                    placeholder="e.g. Expo 2024, Referral"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Contact Info */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6 text-brand-400 uppercase tracking-widest text-xs font-bold border-b border-brand-50 pb-2">
                                        <span className="material-icons-outlined text-sm">contacts</span>
                                        Contact Information
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Phone Numbers */}
                                        <div>
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Phone Numbers</label>
                                            <div className="space-y-3">
                                                {formData.phone.split(',').map((p, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="relative flex-1">
                                                            <span className="material-icons-outlined absolute left-3.5 top-3.5 text-brand-300 text-lg">call</span>
                                                            <input
                                                                type="text"
                                                                value={p.trim()}
                                                                onChange={e => {
                                                                    const parts = formData.phone.split(',');
                                                                    parts[i] = e.target.value;
                                                                    setFormData({ ...formData, phone: parts.join(',') });
                                                                }}
                                                                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-medium"
                                                                placeholder="+91..."
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const parts = formData.phone.split(',');
                                                                parts.splice(i, 1);
                                                                setFormData({ ...formData, phone: parts.join(',') });
                                                            }}
                                                            className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <span className="material-icons-outlined">delete</span>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => setFormData({ ...formData, phone: formData.phone + (formData.phone ? ', ' : '') + '' })}
                                                    className="text-xs font-bold text-accent hover:text-accent-dark flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent/5 w-fit transition-colors"
                                                >
                                                    <span className="material-icons-outlined text-sm">add_circle</span>
                                                    Add Another Phone
                                                </button>
                                            </div>
                                        </div>

                                        {/* Emails */}
                                        <div className="mt-2">
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Email Addresses</label>
                                            <div className="space-y-3">
                                                {formData.email.split(',').map((email, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="relative flex-1">
                                                            <span className="material-icons-outlined absolute left-3.5 top-3.5 text-brand-300 text-lg">email</span>
                                                            <input
                                                                type="email"
                                                                value={email.trim()}
                                                                onChange={e => {
                                                                    const parts = formData.email.split(',');
                                                                    parts[i] = e.target.value;
                                                                    setFormData({ ...formData, email: parts.join(',') });
                                                                }}
                                                                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-medium"
                                                                placeholder="name@example.com"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const parts = formData.email.split(',');
                                                                parts.splice(i, 1);
                                                                setFormData({ ...formData, email: parts.join(',') });
                                                            }}
                                                            className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <span className="material-icons-outlined">delete</span>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => setFormData({ ...formData, email: formData.email + (formData.email ? ', ' : '') + '' })}
                                                    className="text-xs font-bold text-accent hover:text-accent-dark flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent/5 w-fit transition-colors"
                                                >
                                                    <span className="material-icons-outlined text-sm">add_circle</span>
                                                    Add Another Email
                                                </button>
                                            </div>
                                        </div>

                                        {/* Address */}
                                        <div className="mt-2">
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Office Address</label>
                                            <textarea
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full p-3.5 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-medium placeholder-brand-300 min-h-[80px]"
                                                placeholder="e.g. 123 Business Park, New Delhi"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Section: Offerings */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6 text-brand-400 uppercase tracking-widest text-xs font-bold border-b border-brand-50 pb-2">
                                        <span className="material-icons-outlined text-sm">inventory_2</span>
                                        Offerings & Branding
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Products & Services</label>
                                            <textarea
                                                value={formData.products}
                                                onChange={e => setFormData({ ...formData, products: e.target.value })}
                                                className="w-full p-3.5 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 font-medium h-24 placeholder-brand-300"
                                                placeholder="List key items, services, or specializations..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">Tagline</label>
                                                <input
                                                    type="text"
                                                    value={formData.tagline}
                                                    onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                                                    className="w-full p-3.5 bg-white border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-brand-700 italic placeholder-brand-300"
                                                    placeholder="e.g. 'Quality you can trust'"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Modal Footer (Actions) */}
                            <div className="px-8 py-5 border-t border-brand-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between z-20 gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    {formData.id && (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all text-sm font-bold whitespace-nowrap"
                                        >
                                            <span className="material-icons-outlined text-lg">delete_outline</span>
                                            <span>Delete Vendor</span>
                                        </button>
                                    )}

                                    {/* Status Message */}
                                    {uploadStatus && (
                                        <div className={`text-xs font-bold px-3 py-1.5 rounded-lg animate-pulse flex items-center gap-2 ${statusType === 'error' ? 'bg-red-50 text-red-600' :
                                            statusType === 'success' ? 'bg-green-50 text-green-600' :
                                                'bg-brand-50 text-brand-500'
                                            }`}>
                                            <span className="material-icons-outlined text-sm">
                                                {statusType === 'error' ? 'error' : statusType === 'success' ? 'check_circle' : 'info'}
                                            </span>
                                            {uploadStatus}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowReviewModal(false)}
                                        className="px-6 py-3 font-bold text-brand-600 hover:text-brand-900 hover:bg-brand-50 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveVendor}
                                        disabled={loading}
                                        className="px-8 py-3 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:shadow-accent/20 transition-all transform active:scale-95 flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Save Changes</span>
                                                <span className="material-icons-outlined text-sm">check</span>
                                            </>
                                        )}
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
        </div >
    );
};

export default Dashboard;
