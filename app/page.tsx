"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function Page() {
    const githubRepo = 'https://github.com/darshankparmar/ImageFusion';
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [disabled, setDisabled] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [hasBase, setHasBase] = useState(false);
    const [hasProd, setHasProd] = useState(false);
    const [dropBase, setDropBase] = useState(false);
    const [dropProd, setDropProd] = useState(false);
    const [sampleAlt, setSampleAlt] = useState(false);
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

    const setPreview = (input: HTMLInputElement | null, img: HTMLImageElement | null, which?: 'base' | 'prod') => {
        if (!input || !img) return;
        const file = input.files?.[0];
        if (!file) {
            img.src = '';
            if (which === 'base') setHasBase(false);
            if (which === 'prod') setHasProd(false);
            return;
        }
        // Optional: simple size check, warn if very large
        const maxMB = 10;
        if (file.size > maxMB * 1024 * 1024) {
            setError(`Selected file is larger than ${maxMB}MB. Consider a smaller image for faster processing.`);
        }
        const reader = new FileReader();
        reader.onload = () => { img.src = String(reader.result); };
        reader.readAsDataURL(file);
        if (which === 'base') setHasBase(true);
        if (which === 'prod') setHasProd(true);
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
        setPreview(input, which === 'base' ? basePrevRef.current : prodPrevRef.current, which);
    };

    const useSampleImages = async () => {
        if (disabled || generating || loadingSamples) return;
        try {
            setLoadingSamples(true);
            setError(''); setStatus('');
            // Toggle between two curated sample sets on each click
            const modelUrl1 = 'https://raw.githubusercontent.com/darshankparmar/ImageFusion/main/images/model/model.png';
            const productUrl1 = 'https://raw.githubusercontent.com/darshankparmar/ImageFusion/main/images/products/dress.png';
            const modelUrl2 = 'https://raw.githubusercontent.com/darshankparmar/ImageFusion/main/images/model/katrina.png';
            const productUrl2 = 'https://raw.githubusercontent.com/darshankparmar/ImageFusion/main/images/products/product.jpeg';

            const useAlt = sampleAlt; // current state decides which to load now
            const modelUrl = useAlt ? modelUrl2 : modelUrl1;
            const productUrl = useAlt ? productUrl2 : productUrl1;
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
                setPreview(baseRef.current, basePrevRef.current, 'base');
            }
            if (prodRef.current) {
                const dt2 = new DataTransfer();
                dt2.items.add(prodFile);
                prodRef.current.files = dt2.files;
                setPreview(prodRef.current, prodPrevRef.current, 'prod');
            }
            const samplePrompt1 = `Create a professional e-commerce fashion photo. Take the blue floral dress
from the first image and let the woman from the second image wear it.
Generate a realistic, full-body shot of the woman wearing the dress, with
the lighting and shadows adjusted to match the outdoor environment.`;
            const samplePrompt2 = `Replace the red purse with the black-and-white handbag, keeping the model’s pose, grip, lighting, and background natural and photo-realistic.`;
            const newPrompt = useAlt ? samplePrompt2 : samplePrompt1;
            if (promptRef.current) {
                promptRef.current.value = newPrompt;
            }
            setPromptText(newPrompt);
            setSampleAlt(!sampleAlt); // flip for next click
        } catch (e) {
            setError('Could not load sample images.');
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
        if (basePrevRef.current) basePrevRef.current.src = '';
        if (prodPrevRef.current) prodPrevRef.current.src = '';
        setHasBase(false);
        setHasProd(false);
        setResultUrl(null); setError(''); setStatus('');
    };

    return (
        <div>
            {/* Header with title */}
            <div className="topbar header">
                <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginBottom: 0, textAlign: 'left' }}>
                    <h1 className="hero-title" style={{ margin: 0, textAlign: 'left' }}>Photofusion</h1>
                    <p className="hero-subtitle" style={{ marginTop: 4, textAlign: 'left' }}>A simple tool for designers and small businesses to generate product shots.</p>
                </div>
            </div>
            <div className="container">

                <div className="grid">
                    <section>
                        <div className="card">
                            <div className="two">
                                <div>
                                    <h3>Base image</h3>
                                    <input aria-label="Upload base image" ref={baseRef} type="file" accept="image/*" className="file" onChange={() => setPreview(baseRef.current, basePrevRef.current, 'base')} style={{ marginBottom: '5px' }} />
                                    <div
                                        className={`preview-frame${dropBase ? ' drop-active' : ''}`}
                                        onDragOver={(e) => { e.preventDefault(); setDropBase(true); }}
                                        onDragEnter={() => setDropBase(true)}
                                        onDragLeave={() => setDropBase(false)}
                                        onDrop={(e) => handleDrop(e, 'base')}
                                        onClick={() => baseRef.current?.click()}
                                    >
                                        <img ref={basePrevRef} alt="Base preview" className="preview" />
                                    </div>
                                </div>
                                <div>
                                    <h3>Product image</h3>
                                    <input aria-label="Upload product image" ref={prodRef} type="file" accept="image/*" className="file" onChange={() => setPreview(prodRef.current, prodPrevRef.current, 'prod')} style={{ marginBottom: '5px' }} />
                                    <div
                                        className={`preview-frame${dropProd ? ' drop-active' : ''}`}
                                        onDragOver={(e) => { e.preventDefault(); setDropProd(true); }}
                                        onDragEnter={() => setDropProd(true)}
                                        onDragLeave={() => setDropProd(false)}
                                        onDrop={(e) => handleDrop(e, 'prod')}
                                        onClick={() => prodRef.current?.click()}
                                    >
                                        <img ref={prodPrevRef} alt="Product preview" className="preview" />
                                    </div>
                                </div>
                            </div>
                            <div className="sample-row">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-block btn-inline"
                                    disabled={disabled || generating || loadingSamples}
                                    aria-busy={loadingSamples}
                                    onClick={useSampleImages}
                                >
                                    {loadingSamples ? (<><span className="btn-loader" />Loading…</>) : 'Try sample images'}
                                </button>
                                <div className="info-wrap" ref={infoWrapRef}>
                                    <button
                                        type="button"
                                        className="btn-icon"
                                        aria-label="Samples info"
                                        onClick={(e) => { e.stopPropagation(); toggleSampleInfo(); }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
                                            <path d="M12 17v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                            <circle cx="12" cy="7.5" r="1.2" fill="currentColor" />
                                        </svg>
                                    </button>
                                    {showSampleInfo && (
                                        <div className="tooltip" role="tooltip">
                                            <div className="tooltip-card">
                                                Loads sample images. Tap again to switch to the alternate sample set.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <span>Prompt</span>
                                </h3>
                                <textarea
                                    ref={promptRef}
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    required
                                    placeholder="Describe exactly how the product should appear on the model (position, lighting, shadows, perspective)."
                                    className="textarea"
                                />
                                <div className="actions">
                                    <button
                                        disabled={disabled || !hasBase || !hasProd || (promptText.trim() === '')}
                                        onClick={onGenerate}
                                        className="btn btn-primary btn-block btn-inline"
                                    >
                                        {generating ? (<><span className="btn-loader" />Generating…</>) : 'Generate'}
                                    </button>
                                    <button disabled={disabled} onClick={onClear} className="btn btn-secondary btn-block btn-inline">Clear</button>
                                    <span className="muted" style={{ marginLeft: '10px' }}>{status}</span>
                                </div>
                                {error ? <div className="error">{error}</div> : null}
                            </div>
                        </div>
                        {/* removed inline footer; moved to global footer bar */}
                    </section>

                    <aside>
                        {(!resultUrl && generating) && (
                            <div className="card">
                                <h3>Result</h3>
                                <div className="skeleton" aria-hidden="true" />
                            </div>
                        )}
                        {resultUrl && (
                            <div className="card">
                                <h3>Result</h3>
                                <img alt="Result image" src={resultUrl} className="result-img" />
                                <div className="actions">
                                    <a href={resultUrl} download="fused.png"><button className="btn btn-secondary">Download</button></a>
                                    <a href={resultUrl} target="_blank" rel="noopener"><button className="btn btn-secondary">Open</button></a>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
            {/* Professional footer */}
            <div className="footer-bar">
                <div className="container footer-row">
                    <div className="contact-block">
                        <span>Interested in a specific use case related to this? Contact:</span>
                        <div className="contact-items">
                            <span className="contact-item">
                                <span className="icon" aria-hidden>📞</span>
                                <a href="tel:+918469108864" style={{ textDecoration: 'none' }}>+91 84691 08864</a>
                            </span>
                            <span className="contact-sep">•</span>
                            <span className="contact-item">
                                <span className="icon" aria-hidden>✉️</span>
                                <a href="mailto:darshanparmar.dev@gmail.com" style={{ textDecoration: 'none' }}>darshanparmar.dev@gmail.com</a>
                            </span>
                        </div>
                    </div>
                    <div className="footer-actions">
                        <a href={githubRepo} target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" className="gh">
                            <svg viewBox="0 0 16 16" width={20} height={20} aria-hidden="true">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
            {generating && (
                <div className="overlay" role="status" aria-live="polite" aria-label="Generating image">
                    <div className="overlay-card">
                        <div className="loader" />
                        <div>Generating image… This can take a few seconds.</div>
                    </div>
                </div>
            )}
        </div>
    );
}
