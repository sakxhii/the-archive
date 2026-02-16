
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

const Dashboard = () => {
    const [file, setFile] = useState(null);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingStep, setProcessingStep] = useState('idle'); // idle, extracting, reviewing, saving
    const [uploadStatus, setUploadStatus] = useState('');
    const [statusType, setStatusType] = useState('info');

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
        tagline: '',
        social_media: '',
        designation: '',
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

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setUploadStatus('');
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setProcessingStep('extracting');
        setUploadStatus('Digitizing business card...');
        setStatusType('info');

        const data = new FormData();
        data.append('file', file);

        try {
            const res = await axios.post(`${API_BASE_URL}/analyze-card`, data);

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
                tagline: raw.additional_info?.tagline || '',
                social_media: raw.additional_info?.social_media || '',
                designation: raw.additional_info?.designation || '',
                image_path: raw.image_path
            });

            setProcessingStep('reviewing');
            setShowReviewModal(true);
            setUploadStatus('Please review the details below.');
        } catch (err) {
            console.error(err);
            setUploadStatus('Failed to process image.');
            setStatusType('error');
            setProcessingStep('idle');
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
            image_path: card.image_path
        });
        setUploadStatus('');
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
                    designation: formData.designation
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
            setFile(null);
            fetchCards();
            setProcessingStep('idle');
        } catch (err) {
            console.error(err);
            setUploadStatus('Failed to save vendor.');
            setStatusType('error');
            setLoading(false);
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
        <div className="bg-brand-50 min-h-screen pt-28 pb-12 px-6">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-brand-200 pb-6 gap-6">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-brand-900 mb-2">The Archive Manager</h1>
                        <p className="text-brand-500 font-medium">Digitize your rolodex and manage supplier relationships.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white px-6 py-3 rounded-lg shadow-sm border border-brand-100 flex items-center gap-3">
                            <span className="text-3xl font-serif font-bold text-accent">{cards.length}</span>
                            <span className="text-xs font-bold text-brand-400 uppercase tracking-widest leading-tight">Total<br />Vendors</span>
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-4 w-full md:w-auto flex-1">
                        <div className="relative flex-1 md:max-w-md">
                            <span className="material-icons-outlined absolute left-3 top-3 text-brand-300">search</span>
                            <input
                                type="text"
                                placeholder="Search vendors by name or products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:border-accent text-brand-800 bg-white shadow-sm"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-3 rounded-xl border border-brand-200 focus:outline-none focus:border-accent text-brand-800 bg-white shadow-sm font-medium cursor-pointer hover:bg-brand-50 transition-colors"
                            >
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <span className="material-icons-outlined absolute right-3 top-3 text-brand-400 pointer-events-none">filter_list</span>
                        </div>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-brand-200 text-brand-600 font-bold rounded-xl hover:bg-brand-50 hover:text-brand-800 transition-colors shadow-sm"
                    >
                        <span className="material-icons-outlined">download</span>
                        Export CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Upload Sidebar */}
                    <div className="lg:col-span-4 xl:col-span-3">
                        <div className="bg-white rounded-2xl shadow-lg border border-brand-100 p-8 sticky top-24">
                            <h2 className="text-xl font-bold text-brand-800 mb-6 flex items-center gap-2 font-serif">
                                <span className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm shadow-md">
                                    <span className="material-icons-outlined text-sm">add</span>
                                </span>
                                Add New Vendor
                            </h2>

                            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 group ${file ? 'border-accent bg-accent/5' : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50'}`}>
                                <input type="file" accept="image/*" onChange={handleFileChange} id="file-upload" className="hidden" />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center h-full">
                                    {file ? (
                                        <>
                                            <div className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center mb-3">
                                                <span className="material-icons-outlined text-3xl text-accent">image</span>
                                            </div>
                                            <p className="text-sm font-bold text-brand-700 truncate max-w-[200px]">{file.name}</p>
                                            <p className="text-xs text-accent mt-1 font-medium">Click to replace</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <span className="material-icons-outlined text-3xl text-brand-300 group-hover:text-brand-500">cloud_upload</span>
                                            </div>
                                            <p className="text-sm font-bold text-brand-600">Upload Business Card</p>
                                            <p className="text-xs text-brand-400 mt-2">Supports JPG, PNG</p>
                                        </>
                                    )}
                                </label>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={!file || loading}
                                className={`w-full mt-6 py-4 rounded-xl font-bold shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2 ${!file || loading
                                    ? 'bg-brand-100 text-brand-300 cursor-not-allowed shadow-none'
                                    : 'bg-brand-900 text-white hover:bg-brand-800 hover:shadow-lg'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Processing...</span>
                                    </>
                                ) : 'Extract Data'}
                            </button>

                            {uploadStatus && !showReviewModal && (
                                <div className={`mt-6 p-4 rounded-xl text-sm border flex items-start gap-3 animate-fade-in-up ${statusType === 'success' ? 'bg-green-50 text-green-800 border-green-100' :
                                    statusType === 'error' ? 'bg-red-50 text-red-800 border-red-100' :
                                        'bg-blue-50 text-blue-800 border-blue-100'
                                    }`}>
                                    <span className="material-icons-outlined text-lg">
                                        {statusType === 'success' ? 'check_circle' : statusType === 'error' ? 'error_outline' : 'info'}
                                    </span>
                                    <span className="font-medium mt-0.5">{uploadStatus}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="lg:col-span-8 xl:col-span-9">
                        <div className="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-brand-50/50 border-b border-brand-100">
                                            <th className="p-6 text-xs font-bold text-brand-400 uppercase tracking-widest text-center w-24">Card</th>
                                            <th className="p-6 text-xs font-bold text-brand-400 uppercase tracking-widest">Business Details</th>
                                            <th className="p-6 text-xs font-bold text-brand-400 uppercase tracking-widest">Category</th>
                                            <th className="p-6 text-xs font-bold text-brand-400 uppercase tracking-widest">Contact</th>
                                            <th className="p-6 text-xs font-bold text-brand-400 uppercase tracking-widest w-20">Link</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-50">
                                        {filteredCards.map(card => (
                                            <tr
                                                key={card.id}
                                                onClick={() => handleCardClick(card)}
                                                className="hover:bg-brand-50/30 transition-colors group cursor-pointer"
                                            >
                                                <td className="p-4">
                                                    <div className="h-14 w-20 bg-brand-100 rounded-lg overflow-hidden border border-brand-200 relative shadow-sm group-hover:shadow-md transition-all flex items-center justify-center text-brand-300">
                                                        {card.image_path && card.image_path !== 'None' && card.image_path !== 'null' ? (
                                                            <img
                                                                src={`${API_BASE_URL}/${card.image_path}`}
                                                                alt="Scan"
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-brand-50'); }}
                                                            />
                                                        ) : (
                                                            <span className="material-icons-outlined text-2xl">image_not_supported</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <p className="font-bold text-brand-800 text-base font-serif">{card.name}</p>
                                                    {card.additional_info && Object.keys(card.additional_info).length > 0 && (
                                                        <p className="text-xs text-brand-400 mt-1 line-clamp-1 italic">
                                                            {Object.values(card.additional_info).map(v => String(v)).join(', ')}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="p-6">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100 uppercase tracking-wide">
                                                        {card.category}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-1 text-sm text-brand-600">
                                                        {card.contact && card.contact.split('|').map((part, i) => (
                                                            <span key={i} className="flex items-center gap-1">
                                                                {part.includes('Ph:') && <span className="material-icons-outlined text-brand-300 text-xs">call</span>}
                                                                {part.includes('✉') && <span className="material-icons-outlined text-brand-300 text-xs">email</span>}
                                                                {part.includes('📍') && <span className="material-icons-outlined text-brand-300 text-xs">place</span>}
                                                                <span className="font-medium truncate max-w-[150px]">{part.replace(/Ph:|✉|📍/g, '').trim()}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-6 text-center" onClick={(e) => e.stopPropagation()}>
                                                    {card.website ? (
                                                        <a
                                                            href={card.website.startsWith('http') ? card.website : `https://${card.website}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-8 h-8 rounded-full bg-brand-50 hover:bg-accent hover:text-white flex items-center justify-center text-brand-400 transition-colors mx-auto"
                                                        >
                                                            <span className="material-icons-outlined text-sm">launch</span>
                                                        </a>
                                                    ) : (
                                                        <span className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-200 mx-auto cursor-not-allowed">
                                                            <span className="material-icons-outlined text-sm">link_off</span>
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredCards.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="p-24 text-center">
                                                    <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <span className="material-icons-outlined text-5xl text-brand-200">filter_list_off</span>
                                                    </div>
                                                    <h3 className="text-xl font-serif font-bold text-brand-800 mb-2">No Vendors Found</h3>
                                                    <p className="text-brand-400 max-w-sm mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
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
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Business Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-3 bg-brand-50 border border-brand-200 rounded-lg focus:outline-none focus:border-accent font-serif font-bold text-brand-800"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Designation</label>
                                        <input
                                            type="text"
                                            value={formData.designation}
                                            onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Products & Services Offered</label>
                                        <textarea
                                            value={formData.products}
                                            onChange={e => setFormData({ ...formData, products: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700 h-24"
                                            placeholder="List the key items or services this vendor provides (e.g., 'Wedding Cakes, Custom Pastries, Catering')..."
                                        />
                                    </div>

                                    <div className="col-span-2 border-t border-brand-100 my-2 pt-4">
                                        <p className="text-brand-400 text-xs font-bold mb-4">CONTACT INFORMATION</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Phone Numbers</label>
                                        <div className="space-y-2">
                                            {formData.phone.split(',').map((p, i) => (
                                                <div key={i} className="flex gap-2">
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
                                                <div key={i} className="flex gap-2">
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
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Website</label>
                                        <input
                                            type="text"
                                            value={formData.website}
                                            onChange={e => setFormData({ ...formData, website: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700"
                                        />
                                    </div>

                                    <div className="col-span-2 border-t border-brand-100 my-2 pt-4">
                                        <p className="text-brand-400 text-xs font-bold mb-4">SOCIAL & BRANDING</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Tagline</label>
                                        <input
                                            type="text"
                                            value={formData.tagline}
                                            onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-brand-500 uppercase tracking-widest mb-1">Social Media</label>
                                        <input
                                            type="text"
                                            value={formData.social_media}
                                            onChange={e => setFormData({ ...formData, social_media: e.target.value })}
                                            className="w-full p-3 bg-white border border-brand-200 rounded-lg focus:outline-none focus:border-accent text-brand-700"
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
