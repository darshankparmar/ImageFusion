"use client";
import React, { useState, useRef } from 'react';

export default function Page() {
    const githubRepo = 'https://github.com/darshankparmar/ImageFusion';
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [disabled, setDisabled] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [preset, setPreset] = useState('natural');

    const baseRef = useRef<HTMLInputElement>(null);
    const prodRef = useRef<HTMLInputElement>(null);
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const basePrevRef = useRef<HTMLImageElement>(null);
    const prodPrevRef = useRef<HTMLImageElement>(null);

    const setPreview = (input: HTMLInputElement | null, img: HTMLImageElement | null) => {
        if (!input || !img) return;
        const file = input.files?.[0];
        if (!file) { img.src = ''; return; }
        const reader = new FileReader();
        reader.onload = () => { img.src = String(reader.result); };
        reader.readAsDataURL(file);
    };

    const useSampleImages = async () => {
        if (disabled || generating) return;
        try {
            setError(''); setStatus('');
            const modelUrl = 'https://raw.githubusercontent.com/darshankparmar/ImageFusion/main/images/model/model.png';
            const productUrl = 'https://raw.githubusercontent.com/darshankparmar/ImageFusion/main/images/products/dress.png';
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
                setPreview(baseRef.current, basePrevRef.current);
            }
            if (prodRef.current) {
                const dt2 = new DataTransfer();
                dt2.items.add(prodFile);
                prodRef.current.files = dt2.files;
                setPreview(prodRef.current, prodPrevRef.current);
            }
            const samplePrompt = `Create a professional e-commerce fashion photo. Take the blue floral dress
from the first image and let the woman from the second image wear it.
Generate a realistic, full-body shot of the woman wearing the dress, with
the lighting and shadows adjusted to match the outdoor environment.`;
            if (promptRef.current) {
                promptRef.current.value = samplePrompt;
            }
            setStatus('Loaded sample images and prompt.');
        } catch (e) {
            setError('Could not load sample images.');
        }
    };

    const onGenerate = async () => {
        setError(''); setStatus('');
        const base = baseRef.current?.files?.[0];
        const prod = prodRef.current?.files?.[0];
        const presetMap: Record<string, string> = {
            natural: 'Place the product naturally on the model. Match lighting, perspective, and shadows for a realistic look.',
            seamless: 'Blend the product seamlessly into the scene in a photorealistic style. Ensure edges, lighting, and shadows are coherent.',
            catalog: 'Generate a clean catalog-style visualization of the product on a neutral background with even lighting.',
            premium: 'Creative variation: style the product as premium advertising imagery with refined lighting and subtle depth.',
            stylized: 'Stylized variation: produce a sketch or cartoon-like mockup of the product while keeping proportions accurate.'
        };
        const typedPrompt = (promptRef.current?.value || '').trim();
        const prompt = typedPrompt || presetMap[preset];
        if (!base || !prod) { setError('Please select both images.'); return; }
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
        if (basePrevRef.current) basePrevRef.current.src = '';
        if (prodPrevRef.current) prodPrevRef.current.src = '';
        setResultUrl(null); setError(''); setStatus('');
    };

    return (
        <div>
            {/* Top header with GitHub icon */}
            <div className="topbar">
                <a href={githubRepo} target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" className="gh">
                    <svg viewBox="0 0 16 16" width={20} height={20} aria-hidden="true">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                </a>
            </div>
            <div className="container">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ margin: 0, marginBottom: 6, fontWeight: 700 }}>Image Fusion with Gemini 2.5 Flash Image (Preview)</h1>
                        <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>Upload a base scene and a product image, add instructions, and generate a fused, photorealistic image.</p>
                    </div>
                </div>

                <div className="grid">
                    <section>
                        <div className="card">
                            <div className="two">
                                <div>
                                    <h3>Base image</h3>
                                    <input ref={baseRef} type="file" accept="image/*" className="file" onChange={() => setPreview(baseRef.current, basePrevRef.current)} />
                                    <div className="preview-frame"><img ref={basePrevRef} alt="Base preview" className="preview" /></div>
                                </div>
                                <div>
                                    <h3>Product image</h3>
                                    <input ref={prodRef} type="file" accept="image/*" className="file" onChange={() => setPreview(prodRef.current, prodPrevRef.current)} />
                                    <div className="preview-frame"><img ref={prodPrevRef} alt="Product preview" className="preview" /></div>
                                </div>
                            </div>
                            <div className="actions" style={{ marginTop: 10 }}>
                                <button type="button" className="btn btn-secondary btn-block btn-inline" disabled={disabled || generating} onClick={useSampleImages}>Try sample images</button>
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <span>Prompt</span>
                                    <span className="muted" style={{ fontSize: '0.9rem' }}>Optional</span>
                                </h3>
                                <label className="muted" style={{ display: 'block', marginBottom: 6, fontSize: '0.95rem' }}>Preset</label>
                                <select className="select" value={preset} onChange={(e) => setPreset(e.target.value)}>
                                    <option value="natural">Place product naturally (match lighting/shadows)</option>
                                    <option value="seamless">Blend seamlessly, photorealistic</option>
                                    <option value="catalog">Clean catalog-style on neutral background</option>
                                    <option value="premium">Creative premium advertising style</option>
                                    <option value="stylized">Stylized sketch/cartoon mockup</option>
                                </select>
                                <div style={{ height: 8 }} />
                                <div className="muted" style={{ fontSize: '0.9rem', marginBottom: 6 }}>
                                    If you leave the prompt empty, we’ll use your selected preset.
                                </div>
                                <textarea ref={promptRef} placeholder="E.g., Place the chair in the back-left corner and match lighting and perspective." className="textarea" />
                                <div className="actions">
                                    <button disabled={disabled} onClick={onGenerate} className="btn btn-primary btn-block btn-inline">Generate</button>
                                    <button disabled={disabled} onClick={onClear} className="btn btn-secondary btn-block btn-inline">Clear</button>
                                    <span className="muted">{status}</span>
                                </div>
                                {error ? <div className="error">{error}</div> : null}
                            </div>
                        </div>
                        <div className="footer">Model: gemini-2.5-flash-image-preview • Images include SynthID watermark.</div>
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
                                </div>
                            </div>
                        )}
                    </aside>
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
