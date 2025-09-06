"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function Page() {
    const githubRepo = 'https://github.com/darshankparmar/Photofusion';
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [disabled, setDisabled] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [hasBase, setHasBase] = useState(false);
    const [hasProd, setHasProd] = useState(false);
    const [basePreview, setBasePreview] = useState<string | null>(null);
    const [prodPreview, setProdPreview] = useState<string | null>(null);
    const [dropBase, setDropBase] = useState(false);
    const [dropProd, setDropProd] = useState(false);
    const [sampleIdx, setSampleIdx] = useState(0);
    const [loadingSamples, setLoadingSamples] = useState(false);
    const [showSampleInfo, setShowSampleInfo] = useState(false);

    const baseRef = useRef<HTMLInputElement>(null);
    const prodRef = useRef<HTMLInputElement>(null);
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const basePrevRef = useRef<HTMLImageElement>(null);
    const prodPrevRef = useRef<HTMLImageElement>(null);
    const infoWrapRef = useRef<HTMLDivElement>(null);
    const infoTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!showSampleInfo) return;
            const el = infoWrapRef.current;
            if (el && !el.contains(e.target as Node)) {
                setShowSampleInfo(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowSampleInfo(false);
        };
        window.addEventListener('click', onDocClick);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('click', onDocClick);
            window.removeEventListener('keydown', onKey);
        };
    }, [showSampleInfo]);

    const toggleSampleInfo = () => {
        const next = !showSampleInfo;
        setShowSampleInfo(next);
        if (infoTimerRef.current) {
            window.clearTimeout(infoTimerRef.current);
            infoTimerRef.current = null;
        }
        if (next) {
            infoTimerRef.current = window.setTimeout(() => setShowSampleInfo(false), 4000);
        }
    };

    const setPreview = (input: HTMLInputElement | null, which: 'base' | 'prod') => {
        if (!input) return;
        const file = input.files?.[0];
        if (!file) {
            if (which === 'base') setHasBase(false);
            if (which === 'prod') setHasProd(false);
            if (which === 'base') setBasePreview(null);
            if (which === 'prod') setProdPreview(null);
            return;
        }
        const maxMB = 10;
        if (file.size > maxMB * 1024 * 1024) {
            setError(`Selected file is larger than ${maxMB}MB. Consider a smaller image for faster processing.`);
        }
        const reader = new FileReader();
        reader.onload = () => {
            const url = String(reader.result);
            if (which === 'base') {
                setBasePreview(url);
                setHasBase(true);
            } else {
                setProdPreview(url);
                setHasProd(true);
            }
        };
        reader.readAsDataURL(file);
        // flags are set in onload to ensure preview URL exists
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, which: 'base' | 'prod') => {
        e.preventDefault();
        if (which === 'base') setDropBase(false); else setDropProd(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const input = which === 'base' ? baseRef.current : prodRef.current;
        if (!input) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        setPreview(input, which);
    };

    const sets = [
        {
            model: 'https://raw.githubusercontent.com/darshankparmar/Photofusion/main/images/model/alia.jpg',
            product: 'https://raw.githubusercontent.com/darshankparmar/Photofusion/main/images/products/goggle.jpg',
            prompt: 'Add the provided goggles to the model\'s face, aligning naturally with her eyes and facial angle. Ensure correct size, perspective, lighting, and shadows so it looks realistic while keeping her pose, skin tone, and background unchanged.',
        },
        {
            model: 'https://raw.githubusercontent.com/darshankparmar/Photofusion/main/images/model/model.png',
            product: 'https://raw.githubusercontent.com/darshankparmar/Photofusion/main/images/products/dress.png',
            prompt: 'Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it. Generate a realistic, full-body shot of the woman wearing the dress, with the lighting and shadows adjusted to match the outdoor environment.',
        },
        {
            model: 'https://raw.githubusercontent.com/darshankparmar/Photofusion/main/images/model/disapatani.jpeg',
            product: 'https://raw.githubusercontent.com/darshankparmar/Photofusion/main/images/products/jewelry.png',
            prompt: 'Place the diamond necklace naturally on the model\'s neck, aligned and sized realistically. Keep lighting, shadows, and reflections natural for a photorealistic result.',
        },
        {
            model: 'https://raw.githubusercontent.com/darshankparmar/Photofusion/main/images/model/katrina.png',
            product: 'https://raw.githubusercontent.com/darshankparmar/Photofusion/main/images/products/product.jpeg',
            prompt: 'Replace the red purse with the black-and-white handbag, keeping the model\'s pose, grip, lighting, and background natural and photo-realistic.',
        },
    ] as const;

    const useSampleImages = async () => {
        if (disabled || generating || loadingSamples) return;
        try {
            setLoadingSamples(true);
            setError(''); setStatus('');

            const current = sets[sampleIdx % sets.length];
            const modelUrl = current.model;
            const productUrl = current.product;
            const [b1, b2] = await Promise.all([
                fetch(modelUrl).then(r => { if (!r.ok) throw new Error('Fetch sample failed'); return r.blob(); }),
                fetch(productUrl).then(r => { if (!r.ok) throw new Error('Fetch sample failed'); return r.blob(); })
            ]);
            const baseFile = new File([b1], 'model.png', { type: b1.type || 'image/png' });
            const prodFile = new File([b2], 'product.png', { type: b2.type || 'image/png' });
            if (baseRef.current) {
                const dt = new DataTransfer();
                dt.items.add(baseFile);
                baseRef.current.files = dt.files;
                setPreview(baseRef.current, 'base');
            }
            if (prodRef.current) {
                const dt2 = new DataTransfer();
                dt2.items.add(prodFile);
                prodRef.current.files = dt2.files;
                setPreview(prodRef.current, 'prod');
            }
            const newPrompt = current.prompt;
            if (promptRef.current) {
                promptRef.current.value = newPrompt;
            }
            setPromptText(newPrompt);
            setSampleIdx((i) => (i + 1) % sets.length);
        } catch (e) {
            setError('Could not load sample images.');
            setSampleIdx((i) => (i + 1) % sets.length);
        } finally {
            setLoadingSamples(false);
        }
    };

    const onGenerate = async () => {
        setError(''); setStatus('');
        const base = baseRef.current?.files?.[0];
        const prod = prodRef.current?.files?.[0];
        const typedPrompt = (promptText || promptRef.current?.value || '').trim();
        const prompt = typedPrompt;
        if (!base || !prod) { setError('Please select both images.'); return; }
        if (!prompt) { setError('Please enter a prompt.'); return; }
        const form = new FormData();
        form.append('baseImage', base);
        form.append('productImage', prod);
        form.append('prompt', prompt);
        setStatus('Generating image…'); setDisabled(true); setGenerating(true);
        try {
            let resp = await fetch('/api/fuse', { method: 'POST', body: form });
            if (resp.status === 429) {
                const data = await resp.json().catch(() => ({} as any));
                const delay = Math.max(1, (data as any).retryAfterSec || 10);
                setStatus(`Rate limited. Retrying in ${delay}s…`);
                await new Promise(r => setTimeout(r, delay * 1000));
                resp = await fetch('/api/fuse', { method: 'POST', body: form });
            }
            if (!resp.ok) {
                const text = await resp.text();
                try { const j = JSON.parse(text); setError(j.error || 'Request failed.'); }
                catch { setError(text || 'Request failed.'); }
                setStatus('');
                return;
            }
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setStatus('');
        } catch (e) {
            setError('Network or server error.');
            setStatus('');
        } finally {
            setDisabled(false); setGenerating(false);
        }
    };

    const onClear = () => {
        if (baseRef.current) baseRef.current.value = '';
        if (prodRef.current) prodRef.current.value = '';
        if (promptRef.current) promptRef.current.value = '';
        setPromptText('');
        setBasePreview(null);
        setProdPreview(null);
        setHasBase(false);
        setHasProd(false);
        setResultUrl(null); setError(''); setStatus('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Photofusion
                            </h1>
                            <p className="text-gray-600 text-sm sm:text-base mt-1">
                                Professional product shots with AI
                            </p>
                        </div>
                        <a
                            href={githubRepo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-white rounded-full hover:bg-gray-300 transition-colors"
                        >
                            <svg viewBox="0 0 16 16" width={18} height={18} fill="currentColor" aria-hidden>
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                            </svg>
                            <span className="hidden sm:inline">GitHub</span>
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                    {/* Input Section */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Upload Cards */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* Base Image */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-sm font-semibold">1</span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900">Base Image</h3>
                                </div>

                                <input
                                    ref={baseRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={() => setPreview(baseRef.current, 'base')}
                                    className="hidden"
                                    id="base-upload"
                                />

                                <div
                                    className={`relative aspect-square rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden ${dropBase
                                        ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                                        : hasBase
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                    onDragOver={(e) => { e.preventDefault(); setDropBase(true); }}
                                    onDragEnter={() => setDropBase(true)}
                                    onDragLeave={() => setDropBase(false)}
                                    onDrop={(e) => handleDrop(e, 'base')}
                                    onClick={() => document.getElementById('base-upload')?.click()}
                                >
                                    {hasBase && basePreview ? (
                                        <img src={basePreview} alt="Base preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <p className="text-sm font-medium">Upload model photo</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Product Image */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-sm font-semibold">2</span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900">Product Image</h3>
                                </div>

                                <input
                                    ref={prodRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={() => setPreview(prodRef.current, 'prod')}
                                    className="hidden"
                                    id="prod-upload"
                                />

                                <div
                                    className={`relative aspect-square rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden ${dropProd
                                        ? 'border-purple-500 bg-purple-50 scale-[1.02]'
                                        : hasProd
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                    onDragOver={(e) => { e.preventDefault(); setDropProd(true); }}
                                    onDragEnter={() => setDropProd(true)}
                                    onDragLeave={() => setDropProd(false)}
                                    onDrop={(e) => handleDrop(e, 'prod')}
                                    onClick={() => document.getElementById('prod-upload')?.click()}
                                >
                                    {hasProd && prodPreview ? (
                                        <img src={prodPreview} alt="Product preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <p className="text-sm font-medium">Upload product photo</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sample Button */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-gray-900">Try Samples</h3>
                                </div>
                                <div className="relative" ref={infoWrapRef}>
                                    <button
                                        onClick={toggleSampleInfo}
                                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                    >
                                        <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>
                                    {showSampleInfo && (
                                        <div className="absolute top-8 right-0 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-10">
                                            Loads curated sample images. Click again to cycle through different sample sets.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={useSampleImages}
                                disabled={disabled || generating || loadingSamples}
                                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {loadingSamples ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Loading samples...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Try Sample Images
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Prompt Section */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm font-semibold">3</span>
                                </div>
                                <h3 className="font-semibold text-gray-900">Describe Your Vision</h3>
                            </div>

                            <textarea
                                ref={promptRef}
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                placeholder="Describe exactly how the product should appear on the model - position, lighting, shadows, perspective..."
                                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                            />

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={onGenerate}
                                    disabled={disabled || !hasBase || !hasProd || !promptText.trim()}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                                >
                                    {generating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Generate Image
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={onClear}
                                    disabled={disabled}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Status and Error */}
                            {status && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                                    {status}
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Result Section */}
                    <div className="lg:col-span-5 mt-8 lg:mt-0">
                        <div className="sticky top-24">
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </div>
                                    Result
                                </h3>

                                {generating ? (
                                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center animate-pulse">
                                        <div className="text-center">
                                            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-gray-600 font-medium">Creating your image...</p>
                                            <p className="text-gray-500 text-sm mt-1">This may take a few seconds</p>
                                        </div>
                                    </div>
                                ) : resultUrl ? (
                                    <>
                                        <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
                                            <img src={resultUrl} alt="Generated result" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex gap-3">
                                            <a href={resultUrl} download="photofusion-result.png" className="flex-1">
                                                <button className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 5.75V18a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 18v-2.25M12 4l-8 8m0 0l3-3m-3 3l3 3" />
                                                    </svg>
                                                    Download
                                                </button>
                                            </a>
                                            <a href={resultUrl} target="_blank" rel="noopener" className="flex-1">
                                                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    Open
                                                </button>
                                            </a>
                                        </div>
                                    </>
                                ) : (
                                    <div className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                                        <div className="text-center text-gray-500">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="font-medium mb-1">Your result will appear here</p>
                                            <p className="text-sm">Upload images and generate to see the magic</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200/50 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-gray-600 text-sm mb-2">
                                Interested in custom solutions or specific use cases?
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
                                <a
                                    href="tel:+918469108864"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    +91 84691 08864
                                </a>
                                <span className="hidden sm:block text-gray-400">•</span>
                                <a
                                    href="mailto:darshanparmar.dev@gmail.com"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    darshanparmar.dev@gmail.com
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Built with AI & React</span>
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            <span>© 2025 Photofusion</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Loading Overlay */}
            {generating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating Magic...</h3>
                            <p className="text-gray-600 text-sm">
                                Our AI is carefully blending your images. This usually takes 10-30 seconds.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}