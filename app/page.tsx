"use client";
import React, { useState, useRef } from 'react';

const styles = {
    root: {
        minHeight: '100vh', color: '#e7e9ee'
    },
    container: { maxWidth: 1200, margin: '32px auto', padding: '0 20px' },
    h1: { margin: 0, marginBottom: 6, fontWeight: 700 as const },
    p: { marginTop: 0, marginBottom: 20, color: '#9aa3af' },
    grid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 } as React.CSSProperties,
    card: {
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02)), #14161a',
        border: '1px solid #262a31', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.25)', padding: 16
    },
    two: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } as React.CSSProperties,
    file: { display: 'inline-block', padding: '8px 10px', borderRadius: 8, border: '1px solid #262a31', background: '#0f1114', color: '#e7e9ee' },
    frame: { position: 'relative', height: 260, border: '1px dashed #262a31', borderRadius: 10, background: 'repeating-conic-gradient(#0f1114 0% 25%, #0e1013 0% 50%) 50% / 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } as React.CSSProperties,
    img: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' } as React.CSSProperties,
    ta: { width: '100%', minHeight: 110, resize: 'vertical' as const, borderRadius: 10, border: '1px solid #262a31', padding: 10, color: '#e7e9ee', background: '#0f1114' },
    actions: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 },
    btnPrimary: { borderRadius: 10, padding: '10px 14px', border: '1px solid transparent', cursor: 'pointer', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #4f8cff, #7a5cff)' },
    btnSecondary: { borderRadius: 10, padding: '10px 14px', border: '1px solid #262a31', cursor: 'pointer', fontWeight: 600, color: '#e7e9ee', background: 'transparent' },
    muted: { color: '#9aa3af' },
    err: { color: '#ff5d5d', marginTop: 6, fontWeight: 500 },
    resultImg: { width: '100%', height: 'auto', maxHeight: 640, borderRadius: 10, display: 'block', objectFit: 'contain', background: '#0f1114' } as React.CSSProperties,
    footer: { marginTop: 16, color: '#9aa3af' },
};

export default function Page() {
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [disabled, setDisabled] = useState(false);

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

    const onGenerate = async () => {
        setError(''); setStatus('');
        const base = baseRef.current?.files?.[0];
        const prod = prodRef.current?.files?.[0];
        const prompt = (promptRef.current?.value || '').trim();
        if (!base || !prod) { setError('Please select both images.'); return; }
        if (!prompt) { setError('Please enter a prompt.'); return; }
        const form = new FormData();
        form.append('baseImage', base);
        form.append('productImage', prod);
        form.append('prompt', prompt);
        setStatus('Generating…'); setDisabled(true);
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
            setDisabled(false);
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
        <div style={styles.root as any}>
            <div style={styles.container as any}>
                <h1 style={styles.h1 as any}>Image Fusion with Gemini 2.5 Flash Image (Preview)</h1>
                <p style={styles.p as any}>Upload a base scene and a product image, add instructions, and generate a fused, photorealistic image.</p>

                <div style={styles.grid}>
                    <section>
                        <div style={styles.card}>
                            <div style={styles.two as any}>
                                <div>
                                    <h3>Base image</h3>
                                    <input ref={baseRef} type="file" accept="image/*" style={styles.file as any} onChange={() => setPreview(baseRef.current, basePrevRef.current)} />
                                    <div style={styles.frame as any}><img ref={basePrevRef} alt="Base preview" style={styles.img as any} /></div>
                                </div>
                                <div>
                                    <h3>Product image</h3>
                                    <input ref={prodRef} type="file" accept="image/*" style={styles.file as any} onChange={() => setPreview(prodRef.current, prodPrevRef.current)} />
                                    <div style={styles.frame as any}><img ref={prodPrevRef} alt="Product preview" style={styles.img as any} /></div>
                                </div>
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <h3>Prompt</h3>
                                <textarea ref={promptRef} placeholder="E.g., Place the chair in the back-left corner and match lighting and perspective." style={styles.ta as any} />
                                <div style={styles.actions as any}>
                                    <button disabled={disabled} onClick={onGenerate} style={styles.btnPrimary as any}>Generate</button>
                                    <button disabled={disabled} onClick={onClear} style={styles.btnSecondary as any}>Clear</button>
                                    <span style={styles.muted as any}>{status}</span>
                                </div>
                                {error ? <div style={styles.err as any}>{error}</div> : null}
                            </div>
                        </div>
                        <div style={styles.footer as any}>Model: gemini-2.5-flash-image-preview • Images include SynthID watermark.</div>
                    </section>

                    <aside>
                        {resultUrl && (
                            <div style={styles.card}>
                                <h3>Result</h3>
                                <img alt="Result image" src={resultUrl} style={styles.resultImg as any} />
                                <div style={styles.actions as any}>
                                    <a href={resultUrl} download="fused.png"><button style={styles.btnSecondary as any}>Download</button></a>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
