// --- Supabase Database Configuration ---
const SUPABASE_URL = 'https://tupqynbbkurobnijlfhu.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cHF5bmJia3Vyb2JuaWpsZmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTUyMjAsImV4cCI6MjA5NjUzMTIyMH0.NBFIRMmB92E4icvEEdEiJJFDBOBYtYar1NUMn4RYxa8'; 
const supabase1 = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Application State ---
let currentPdfBlobUrl = null;
let originalPdfBuffer = null; 
let originalFileName = "imposed_document.pdf";
let isSignUpMode = false;
let currentOutsString = ""; 

// --- Device Detection & Canvas Preview State ---
let canvasPdfDoc = null;
let pageIntersectionObserver = null;
let canvasZoomScale = 1;
let pinchStartDistance = null;
let pinchStartScale = 1;
let currentVisiblePage = 1;
let totalCanvasPages = 0;
let pageWrapEls = [];
let thumbEls = [];
let activeZoomLayer = null;
const PDFJS_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function isPdfJsReady() {
    return typeof window.pdfjsLib !== 'undefined' && typeof pdfjsLib.getDocument === 'function';
}

if (isPdfJsReady()) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
}

// Desktop Chrome/Edge/Firefox render PDFs natively inside an iframe.
// Android, iOS, tablets, and anything we don't recognize fall back to a
// pdf.js canvas renderer since they lack a native in-browser PDF plugin.
function isDesktopDevice() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    const mobileOrTabletPattern = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobi/i;
    if (mobileOrTabletPattern.test(ua)) return false;

    // iPadOS 13+ reports as "Macintosh" but exposes multi-touch — treat as non-desktop
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return false;

    const knownDesktopPattern = /Windows NT|Macintosh|X11|Linux x86_64|CrOS/i;
    return knownDesktopPattern.test(ua);
}

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const fileInput = document.getElementById('pdfInput');
    const statusMessage = document.getElementById('statusMessage');
    const pdfPreview = document.getElementById('pdfPreview');
    const placeholderText = document.getElementById('placeholderText');
    const pdfCanvasShell = document.getElementById('pdfCanvasShell');
    const pdfCanvasContainer = document.getElementById('pdfCanvasContainer');
    const pdfThumbnailRail = document.getElementById('pdfThumbnailRail');
    const pdfBottomNav = document.getElementById('pdfBottomNav');
    const pdfPrevPageBtn = document.getElementById('pdfPrevPageBtn');
    const pdfNextPageBtn = document.getElementById('pdfNextPageBtn');
    const pdfPageCounter = document.getElementById('pdfPageCounter');
    const pdfZoomOutBtn = document.getElementById('pdfZoomOutBtn');
    const pdfZoomInBtn = document.getElementById('pdfZoomInBtn');
    const pdfZoomResetBtn = document.getElementById('pdfZoomResetBtn');

    // Auth & Layout Elements
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    const navActions = document.getElementById('navActions');
    const mainNavLinks = document.getElementById('mainNavLinks');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authSwitchLink = document.getElementById('authSwitchLink');
    const authSwitchText = document.getElementById('authSwitchText');
    const authError = document.getElementById('authError');
    const logoutBtn = document.getElementById('logoutBtn');

    // Navigation & Modal Elements
    const btnHome = document.getElementById('btnHome');
    const btnDocs = document.getElementById('btnDocs');
    const btnAbout = document.getElementById('btnAbout');
    
    // Modals
    const aboutModal = document.getElementById('aboutModal');
    const docsModal = document.getElementById('docsModal');
    const signUpSuccessModal = document.getElementById('signUpSuccessModal');
    const confirmedModal = document.getElementById('confirmedModal');
    const donateModal = document.getElementById('donateModal');

    // Modal Close Buttons
    const closeAbout = document.getElementById('closeAbout');
    const closeDocs = document.getElementById('closeDocs');
    const closeSignUpSuccess = document.getElementById('closeSignUpSuccess');
    const closeConfirmed = document.getElementById('closeConfirmed');
    const closeDonate = document.getElementById('closeDonate');
    const btnStartUsing = document.getElementById('btnStartUsing');
    
    // Ad and Premium Elements
    const adContainer = document.getElementById('adContainer');
    const donateBtn = document.getElementById('donateBtn');
    const premiumBadge = document.getElementById('premiumBadge');

    // Sidebar Tab UI Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panelSidebar = document.getElementById('panelSidebar');
    const panelTitle = document.getElementById('panelTitle');
    const tabContents = document.querySelectorAll('.tab-content');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const saddleOnlyRows = document.querySelectorAll('.layout-saddle-only');

    // --- Modal Logic ---
    btnAbout.addEventListener('click', () => { aboutModal.style.display = "block"; });
    closeAbout.addEventListener('click', () => { aboutModal.style.display = "none"; });
    
    btnDocs.addEventListener('click', () => { docsModal.style.display = "block"; });
    closeDocs.addEventListener('click', () => { docsModal.style.display = "none"; });

    donateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        donateModal.style.display = "block"; 
    });
    closeDonate.addEventListener('click', () => { donateModal.style.display = "none"; });

    closeSignUpSuccess.addEventListener('click', () => { signUpSuccessModal.style.display = "none"; });
    
    closeConfirmed.addEventListener('click', () => { confirmedModal.style.display = "none"; });
    btnStartUsing.addEventListener('click', () => { confirmedModal.style.display = "none"; });

    btnHome.addEventListener('click', () => {
        aboutModal.style.display = "none";
        docsModal.style.display = "none";
        btnHome.classList.add('active');
        btnDocs.classList.remove('active');
        btnAbout.classList.remove('active');
    });

    window.addEventListener('click', (event) => {
        if (event.target == aboutModal) aboutModal.style.display = "none";
        if (event.target == docsModal) docsModal.style.display = "none";
        if (event.target == signUpSuccessModal) signUpSuccessModal.style.display = "none";
        if (event.target == confirmedModal) confirmedModal.style.display = "none";
        if (event.target == donateModal) donateModal.style.display = "none";
    });

    const topLinks = [btnHome, btnDocs, btnAbout];
    topLinks.forEach(btn => {
        btn.addEventListener('click', () => {
            topLinks.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // --- Sidebar Panel Logic ---
    const closeSidebar = () => {
        panelSidebar.classList.add('closed');
        tabBtns.forEach(btn => btn.classList.remove('active'));
    };

    closePanelBtn.addEventListener('click', closeSidebar);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (btn.classList.contains('active')) {
                closeSidebar();
                return;
            }
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panelSidebar.classList.remove('closed');
            tabContents.forEach(tc => tc.classList.remove('active-tab'));
            document.getElementById(targetId).classList.add('active-tab');
            panelTitle.textContent = btn.getAttribute('title');
        });
    });

    // --- Authentication Workflow ---
    supabase1.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
            confirmedModal.style.display = 'block';
            window.history.replaceState(null, null, window.location.pathname);
        }

        if (session) {
            authScreen.style.display = 'none';
            mainApp.style.display = 'block';
            navActions.style.display = 'flex'; 
            mainNavLinks.style.display = 'flex';
            authError.textContent = '';
            
            if (session.user && session.user.email) {
                logoutBtn.textContent = `Logout ${session.user.email}`;
            }

            try {
                const { data: profile, error } = await supabase1
                    .from('profiles')
                    .select('is_donator, donator_until')
                    .eq('id', session.user.id)
                    .single();

                let isPremium = false;
                
                if (profile && profile.is_donator && profile.donator_until) {
                    const expiryDate = new Date(profile.donator_until);
                    const now = new Date();
                    if (expiryDate > now) {
                        isPremium = true;
                    }
                }

                if (isPremium) {
                    adContainer.style.display = 'none';
                    donateBtn.style.display = 'none';
                    premiumBadge.style.display = 'inline-block';
                } else {
                    adContainer.style.display = 'flex';
                    donateBtn.style.display = 'inline-block';
                    premiumBadge.style.display = 'none';
                }

            } catch (err) {
                console.error("Error fetching profile details:", err);
                adContainer.style.display = 'flex'; 
            }

        } else {
            authScreen.style.display = 'flex';
            mainApp.style.display = 'none';
            navActions.style.display = 'none'; 
            mainNavLinks.style.display = 'none';
            clearPdfState();
            logoutBtn.textContent = 'Logout';
        }
    });

    authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        authError.textContent = '';
        
        if (isSignUpMode) {
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Register a new profile to access the generator.';
            authSubmitBtn.textContent = 'Sign Up';
            authSwitchText.textContent = 'Already have an account?';
            authSwitchLink.textContent = 'Login';
        } else {
            authTitle.textContent = 'Login';
            authSubtitle.textContent = 'Please sign in to access the booklet generator.';
            authSubmitBtn.textContent = 'Sign In';
            authSwitchText.textContent = "Don't have an account?";
            authSwitchLink.textContent = 'Sign Up';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        authSubmitBtn.disabled = true;

        const email = authEmail.value;
        const password = authPassword.value;

        try {
            if (isSignUpMode) {
                const { error } = await supabase1.auth.signUp({ email, password });
                if (error) throw error;
                signUpSuccessModal.style.display = 'block';
                authForm.reset();
            } else {
                const { error } = await supabase1.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error) {
            authError.style.color = '#ff4444';
            authError.textContent = error.message;
        } finally {
            authSubmitBtn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase1.auth.signOut();
        if (error) console.error("Error signing out:", error.message);
    });

    function clearPdfState() {
        if (currentPdfBlobUrl) {
            URL.revokeObjectURL(currentPdfBlobUrl);
        }
        currentPdfBlobUrl = null;
        originalPdfBuffer = null;
        currentOutsString = ""; 
        pdfPreview.src = '';
        pdfPreview.style.display = "none";
        resetCanvasPreview();
        placeholderText.style.display = "block";
        downloadBtn.style.display = "none";
        statusMessage.textContent = '';
        fileInput.value = '';
    }

    // --- Canvas-based Preview (Android / tablet / unrecognized devices) ---
    const MAX_CANVAS_DIMENSION = 2600; // guards against mobile browser canvas size/memory limits

    function resetCanvasPreview() {
        if (pageIntersectionObserver) {
            pageIntersectionObserver.disconnect();
            pageIntersectionObserver = null;
        }
        if (canvasPdfDoc) {
            canvasPdfDoc.destroy();
            canvasPdfDoc = null;
        }
        pdfCanvasContainer.innerHTML = '';
        pdfThumbnailRail.innerHTML = '';
        pdfCanvasShell.classList.remove('active');
        pdfBottomNav.classList.remove('active');
        canvasZoomScale = 1;
        currentVisiblePage = 1;
        totalCanvasPages = 0;
        pageWrapEls = [];
        thumbEls = [];
        activeZoomLayer = null;
    }

    async function renderPdfWithCanvas(blobUrl) {
        resetCanvasPreview();
        pdfCanvasShell.classList.add('active');
        pdfCanvasContainer.innerHTML = '<div class="pdf-canvas-loading">Rendering pages…</div>';

        if (!isPdfJsReady()) {
            console.error("pdf.js failed to load — check network access to cdnjs.cloudflare.com");
            pdfCanvasContainer.innerHTML = '<div class="pdf-canvas-loading">Preview engine failed to load. Check your connection and try again.</div>';
            return;
        }

        const zoomLayer = document.createElement('div');
        zoomLayer.className = 'pdf-zoom-layer';
        activeZoomLayer = zoomLayer;

        try {
            const loadingTask = pdfjsLib.getDocument(blobUrl);
            const pdfDoc = await loadingTask.promise;
            canvasPdfDoc = pdfDoc;
            totalCanvasPages = pdfDoc.numPages;

            pdfCanvasContainer.innerHTML = '';
            pdfCanvasContainer.appendChild(zoomLayer);

            // Reserve space for the thumbnail rail so pages don't render behind it
            const containerWidth = pdfCanvasContainer.clientWidth || 600;
            let renderedAtLeastOne = false;

            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                try {
                    const page = await pdfDoc.getPage(pageNum);
                    const unscaledViewport = page.getViewport({ scale: 1 });
                    let fitScale = (containerWidth - 24) / unscaledViewport.width;
                    if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;

                    // Clamp so the rendered canvas never exceeds a safe pixel size on
                    // memory-constrained mobile devices (avoids a null 2D context).
                    const rawViewport = page.getViewport({ scale: fitScale });
                    const largestSide = Math.max(rawViewport.width, rawViewport.height);
                    const safetyFactor = largestSide > MAX_CANVAS_DIMENSION ? (MAX_CANVAS_DIMENSION / largestSide) : 1;
                    const viewport = page.getViewport({ scale: fitScale * safetyFactor });

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(viewport.width));
                    canvas.height = Math.max(1, Math.round(viewport.height));
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('2D canvas context unavailable for page ' + pageNum);

                    const pageWrap = document.createElement('div');
                    pageWrap.className = 'pdf-page-wrap';
                    pageWrap.dataset.pageNum = String(pageNum);
                    pageWrap.appendChild(canvas);
                    zoomLayer.appendChild(pageWrap);
                    pageWrapEls.push(pageWrap);

                    await page.render({ canvasContext: ctx, viewport }).promise;
                    renderedAtLeastOne = true;

                    // Thumbnail is scaled DOWN from the already-rendered canvas via
                    // drawImage — avoids invoking pdf.js render() twice on the same
                    // page, which is a known source of crashes on some mobile browsers.
                    const thumbWidth = 60;
                    const thumbHeight = Math.max(1, Math.round(canvas.height * (thumbWidth / canvas.width)));
                    const thumbCanvas = document.createElement('canvas');
                    thumbCanvas.width = thumbWidth;
                    thumbCanvas.height = thumbHeight;
                    const thumbCtx = thumbCanvas.getContext('2d');
                    if (thumbCtx) {
                        thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
                    }

                    const thumbItem = document.createElement('div');
                    thumbItem.className = 'pdf-thumb-item';
                    thumbItem.dataset.pageNum = String(pageNum);
                    const thumbLabel = document.createElement('div');
                    thumbLabel.className = 'pdf-thumb-label';
                    thumbLabel.textContent = String(pageNum);
                    thumbItem.appendChild(thumbCanvas);
                    thumbItem.appendChild(thumbLabel);
                    thumbItem.addEventListener('click', () => goToPage(pageNum));
                    pdfThumbnailRail.appendChild(thumbItem);
                    thumbEls.push(thumbItem);
                } catch (pageError) {
                    // One bad page shouldn't take down the whole preview.
                    console.error(`Failed to render page ${pageNum}:`, pageError);
                }
            }

            if (!renderedAtLeastOne) {
                pdfCanvasContainer.innerHTML = '<div class="pdf-canvas-loading">Could not render any pages for this file.</div>';
                pdfBottomNav.classList.remove('active');
                return;
            }

            pdfBottomNav.classList.add('active');
            updatePageUi(1);
            setupPageIndicator();
        } catch (error) {
            console.error("Canvas render error:", error);
            pdfCanvasContainer.innerHTML = '<div class="pdf-canvas-loading">Could not render preview on this device.</div>';
        }
    }

    function updatePageUi(pageNum) {
        currentVisiblePage = pageNum;
        pdfPageCounter.textContent = `Page ${pageNum} / ${totalCanvasPages}`;
        pdfPrevPageBtn.disabled = pageNum <= 1;
        pdfNextPageBtn.disabled = pageNum >= totalCanvasPages;
        thumbEls.forEach(el => {
            el.classList.toggle('active', Number(el.dataset.pageNum) === pageNum);
        });
        const activeThumb = thumbEls[pageNum - 1];
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function goToPage(pageNum) {
        const wrap = pageWrapEls[pageNum - 1];
        if (wrap) {
            wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function setupPageIndicator() {
        if (!pageWrapEls.length) return;

        pageIntersectionObserver = new IntersectionObserver((entries) => {
            let mostVisible = null;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!mostVisible || entry.intersectionRatio > mostVisible.intersectionRatio) {
                        mostVisible = entry;
                    }
                }
            });
            if (mostVisible) {
                updatePageUi(Number(mostVisible.target.dataset.pageNum));
            }
        }, { root: pdfCanvasContainer, threshold: [0.25, 0.5, 0.75] });

        pageWrapEls.forEach(wrap => pageIntersectionObserver.observe(wrap));
    }

    function applyCanvasZoom(newScale) {
        if (!activeZoomLayer) return;
        canvasZoomScale = Math.min(Math.max(newScale, 0.5), 3);
        activeZoomLayer.style.transform = `scale(${canvasZoomScale})`;
        pdfZoomResetBtn.textContent = `${Math.round(canvasZoomScale * 100)}%`;
    }

    // Bottom-nav and pinch-zoom listeners are wired up ONCE here (not per
    // render) — they always act on the CURRENT state via the outer
    // pageWrapEls/activeZoomLayer variables, so re-generating the preview
    // never stacks duplicate handlers or references stale/detached canvases.
    pdfPrevPageBtn.addEventListener('click', () => {
        if (currentVisiblePage > 1) goToPage(currentVisiblePage - 1);
    });
    pdfNextPageBtn.addEventListener('click', () => {
        if (currentVisiblePage < totalCanvasPages) goToPage(currentVisiblePage + 1);
    });
    pdfZoomInBtn.addEventListener('click', () => applyCanvasZoom(canvasZoomScale + 0.25));
    pdfZoomOutBtn.addEventListener('click', () => applyCanvasZoom(canvasZoomScale - 0.25));
    pdfZoomResetBtn.addEventListener('click', () => applyCanvasZoom(1));

    (function setupPinchToZoom() {
        const getTouchDistance = (touches) => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        pdfCanvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                pinchStartDistance = getTouchDistance(e.touches);
                pinchStartScale = canvasZoomScale;
            }
        }, { passive: true });

        pdfCanvasContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && pinchStartDistance && activeZoomLayer) {
                e.preventDefault();
                const newDistance = getTouchDistance(e.touches);
                const ratio = newDistance / pinchStartDistance;
                applyCanvasZoom(pinchStartScale * ratio);
            }
        }, { passive: false });

        pdfCanvasContainer.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                pinchStartDistance = null;
            }
        }, { passive: true });
    })();

    function updateImpositionUiContext() {
        const mode = document.querySelector('input[name="impositionMode"]:checked').value;
        const saddleTabBtn = document.getElementById('saddleTabBtn');

        if (mode === 'multiout' || mode === 'workandturn' || mode === 'sanaol') {
            saddleTabBtn.style.display = 'none'; 
            saddleOnlyRows.forEach(el => el.style.display = 'none');
            
            if (saddleTabBtn.classList.contains('active')) {
                document.querySelector('.tab-btn[data-target="modeGroup"]').click();
            }
        } else {
            saddleTabBtn.style.display = 'flex'; 
            saddleOnlyRows.forEach(el => el.style.display = 'flex');
        }
    }

    // --- Core Layout Processing Function ---
    const generatePreview = async () => {
        if (!originalPdfBuffer) return;

        try {
            statusMessage.style.color = "#ffa31a";
            statusMessage.textContent = "Processing layout...";
            generateBtn.disabled = true;

            const imposedPdfBytes = await createImposedPDF(originalPdfBuffer.slice(0));
            const blob = new Blob([imposedPdfBytes], { type: 'application/pdf' });
            
            if (currentPdfBlobUrl) {
                URL.revokeObjectURL(currentPdfBlobUrl);
            }
            
            currentPdfBlobUrl = URL.createObjectURL(blob);
            placeholderText.style.display = "none";

            if (isDesktopDevice()) {
                resetCanvasPreview();
                pdfPreview.style.display = "block";
                pdfPreview.src = currentPdfBlobUrl;
            } else {
                pdfPreview.style.display = "none";
                pdfPreview.src = "";
                await renderPdfWithCanvas(currentPdfBlobUrl);
            }

            downloadBtn.style.display = "inline-block";
            statusMessage.style.color = "#4CAF50";
            statusMessage.textContent = "Preview updated!";
        } catch (error) {
            console.error(error);
            statusMessage.style.color = "#ff4444";
            statusMessage.textContent = "Error: " + error.message;
        } finally {
            generateBtn.disabled = false;
        }
    };

    fileInput.addEventListener('change', async (e) => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            originalFileName = file.name;
            originalPdfBuffer = await file.arrayBuffer();
            generatePreview();
        }
    });

    generateBtn.addEventListener('click', generatePreview);

    // Complete preset table — every field listed here is force-set whenever
    // its mode is selected, regardless of which mode was active before.
    // This guarantees switching modes always returns to that mode's required
    // defaults instead of inheriting leftover values from another mode.
    const impositionModePresets = {
        saddle: {
            marginLeft: "0.25",
            marginTop: "0.25",
            markLength: "0.125",
            markThickness: "0.013",
            markDistance: "0.138",
            centerGutter: "0"
        },
        perfect16: {
            marginLeft: "0.25",
            marginTop: "0.25",
            markLength: "0.125",
            markThickness: "0.013",
            markDistance: "0.138",
            centerGutter: "0"
        },
        multiout: {
            marginLeft: "0",
            marginTop: "0",
            markLength: "0.125",
            markThickness: "0.013",
            markDistance: "0",
            centerGutter: "0"
        },
        workandturn: {
            marginLeft: "0",
            marginTop: "0",
            markLength: "0.125",
            markThickness: "0.013",
            markDistance: "0",
            centerGutter: "0"
        },
        sanaol: {
            marginLeft: "0",
            marginTop: "0",
            markLength: "0.125",
            markThickness: "0.013",
            markDistance: "0",
            centerGutter: "0"
        }
    };

    function applyImpositionModePreset(mode) {
        const preset = impositionModePresets[mode];
        if (!preset) return;
        Object.keys(preset).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = preset[fieldId];
        });
    }

    const sidebarInputs = document.querySelectorAll('#mainApp input');
    sidebarInputs.forEach(input => {
        if (input.name === 'impositionMode') {
            input.addEventListener('change', () => {
                const mode = input.value;

                // AUTOMATICALLY APPLY PRESETS BASED ON MODE
                applyImpositionModePreset(mode);

                updateImpositionUiContext();
                generatePreview();
            });
        } else if (input.type === 'number' || input.type === 'text') {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); 
                    generatePreview();
                }
            });
            input.addEventListener('blur', generatePreview);
        } else if(input.type === 'checkbox' || input.type === 'radio') {
            input.addEventListener('change', generatePreview);
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (!currentPdfBlobUrl) return;
        const a = document.createElement('a');
        a.href = currentPdfBlobUrl;

        const baseFileName = originalFileName.replace(/\.pdf$/i, '');
        const d = new Date();
        const dateString = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
        
        let finalDownloadName = baseFileName;
        if (currentOutsString) {
            finalDownloadName += ` (${currentOutsString})`;
        }
        finalDownloadName += ` ${dateString}.pdf`;

        a.download = finalDownloadName;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    updateImpositionUiContext();
});

// --- Mathematical Imposition Functions ---

async function createImposedPDF(inputPdfBuffer) {
    const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib; 
    const in2pt = 72; 
    
    currentOutsString = ""; 
    
    const impositionMode = document.querySelector('input[name="impositionMode"]:checked').value;
    const paperWidth = parseFloat(document.getElementById('paperWidth').value) * in2pt;
    const paperHeight = parseFloat(document.getElementById('paperHeight').value) * in2pt;
    const isLandscape = document.getElementById('landscape').checked;
    const doAutoscale = document.getElementById('autoscale').checked;
    const doRotatePages = document.getElementById('rotatePages').checked; 
    const doRotateOutput = document.getElementById('rotateOutput').checked;
    const includeFilename = document.getElementById('includeFilename').checked;
    const includeFilenameLeft = document.getElementById('includeFilenameLeft').checked;
    
    const drawCropMarks = document.getElementById('drawCropMarks').checked;
    const markLength = parseFloat(document.getElementById('markLength').value) * in2pt;
    const markThickness = parseFloat(document.getElementById('markThickness').value) * in2pt;
    const markDistance = parseFloat(document.getElementById('markDistance').value) * in2pt; 
    const marginLeft = parseFloat(document.getElementById('marginLeft').value) * in2pt;
    const marginTop = parseFloat(document.getElementById('marginTop').value) * in2pt;
    const centerGutter = parseFloat(document.getElementById('centerGutter').value) * in2pt;
    const centerOutput = document.getElementById('centerOutput').checked;
    
    // Parse dashed array from user input 
    const spineDashStr = document.getElementById('spineDash').value || "3,3";
    let parsedDashArray = spineDashStr.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
    if (parsedDashArray.length === 0) parsedDashArray = [3, 3];

    const bleedType = document.querySelector('input[name="bleedType"]:checked').value;
    const bleedLR = parseFloat(document.getElementById('bleedLR').value) * in2pt;
    const bleedTB = parseFloat(document.getElementById('bleedTB').value) * in2pt;

    const finalSheetWidth = isLandscape ? Math.max(paperWidth, paperHeight) : Math.min(paperWidth, paperHeight);
    const finalSheetHeight = isLandscape ? Math.min(paperWidth, paperHeight) : Math.max(paperWidth, paperHeight);

    let originalPdf = await PDFDocument.load(inputPdfBuffer);
    
    if (doRotatePages) {
        const tempPdf = await PDFDocument.create();
        const tempEmbedded = await tempPdf.embedPdf(originalPdf, originalPdf.getPageIndices());
        
        for (const embPage of tempEmbedded) {
            const newWidth = embPage.height;
            const newHeight = embPage.width;
            const tempPage = tempPdf.addPage([newWidth, newHeight]);
            
            tempPage.drawPage(embPage, {
                x: 0,
                y: newHeight, 
                rotate: degrees(-90)
            });
        }
        
        const tempBytes = await tempPdf.save();
        originalPdf = await PDFDocument.load(tempBytes);
    }

    const newPdf = await PDFDocument.create();
    const helveticaFont = await newPdf.embedFont(StandardFonts.Helvetica);
    let pageCount = originalPdf.getPageCount();

    if (impositionMode === 'multiout') {
        const embeddedPages = await newPdf.embedPdf(originalPdf, originalPdf.getPageIndices());
        const firstPage = embeddedPages[0];
        const activeBleedLR = (bleedType === 'fixed') ? bleedLR : 0;
        const activeBleedTB = (bleedType === 'fixed') ? bleedTB : 0;

        const itemW = firstPage.width;
        const itemH = firstPage.height;

        const trimW = itemW - (2 * activeBleedLR);
        const trimH = itemH - (2 * activeBleedTB);

        const availW = finalSheetWidth - (2 * marginLeft);
        const availH = finalSheetHeight - (2 * marginTop);

        let cols = Math.floor((availW + centerGutter) / (itemW + centerGutter));
        let rows = Math.floor((availH + centerGutter) / (itemH + centerGutter));

        cols = Math.max(1, cols);
        rows = Math.max(1, rows);

        const outsCount = cols * rows;

        const totalGridWidth = (cols * itemW) + ((cols - 1) * centerGutter);
        const totalGridHeight = (rows * itemH) + ((rows - 1) * centerGutter);

        const startX = centerOutput ? (finalSheetWidth - totalGridWidth) / 2 : marginLeft;
        const startY = centerOutput ? (finalSheetHeight - totalGridHeight) / 2 : (finalSheetHeight - marginTop - totalGridHeight);

        const gridTopY = startY + (rows * itemH) + ((rows - 1) * centerGutter);
        const labelYPos = gridTopY + (drawCropMarks ? markDistance + markLength : 0) + 10;
        const labelXPos = startX - (drawCropMarks ? markDistance + markLength : 0) - 10;

        const outsText = outsCount === 1 ? "1 out" : `${outsCount} outs`;
        currentOutsString = outsText;

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
            const sheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cellX = startX + c * (itemW + centerGutter);
                    const cellY = startY + (rows - 1 - r) * (itemH + centerGutter);

                    sheet.drawPage(embeddedPages[pageIndex], {
                        x: cellX,
                        y: cellY,
                        xScale: 1,
                        yScale: 1
                    });
                }
            }

            if (drawCropMarks) {
                const markColor = rgb(0, 0, 0);
                drawGridCropMarks(sheet, startX, startY, cols, rows, itemW, itemH, trimW, trimH, activeBleedLR, activeBleedTB, centerGutter, markLength, markDistance, markThickness, markColor);
            }
            
            const docLabel = includeFilename ? originalFileName : "";
            const docLabelLeft = includeFilenameLeft ? originalFileName : "";
            
            drawImpositionLabel(sheet, docLabel, helveticaFont, finalSheetWidth, labelYPos, outsText);
            drawLeftImpositionLabel(sheet, docLabelLeft, helveticaFont, finalSheetHeight, labelXPos, outsText);
        }
    } 
    else if (impositionMode === 'workandturn') {
        const embeddedPages = await newPdf.embedPdf(originalPdf, originalPdf.getPageIndices());
        const firstPage = embeddedPages[0];
        const activeBleedLR = (bleedType === 'fixed') ? bleedLR : 0;
        const activeBleedTB = (bleedType === 'fixed') ? bleedTB : 0;

        const itemW = firstPage.width;
        const itemH = firstPage.height;

        const trimW = itemW - (2 * activeBleedLR);
        const trimH = itemH - (2 * activeBleedTB);

        const availW = finalSheetWidth - (2 * marginLeft);
        const availH = finalSheetHeight - (2 * marginTop);

        let cols = Math.floor((availW + centerGutter) / (itemW + centerGutter));
        let rows = Math.floor((availH + centerGutter) / (itemH + centerGutter));

        cols = Math.floor(cols / 2) * 2;
        rows = Math.max(1, rows);

        if (cols < 2) {
            throw new Error("Paper size is too small for Work & Turn layouts. Increase width to fit at least 2 columns.");
        }
        
        const outsCount = cols * rows;

        const totalGridWidth = (cols * itemW) + ((cols - 1) * centerGutter);
        const totalGridHeight = (rows * itemH) + ((rows - 1) * centerGutter);

        const startX = centerOutput ? (finalSheetWidth - totalGridWidth) / 2 : marginLeft;
        const startY = centerOutput ? (finalSheetHeight - totalGridHeight) / 2 : (finalSheetHeight - marginTop - totalGridHeight);

        const gridTopY = startY + (rows * itemH) + ((rows - 1) * centerGutter);
        const labelYPos = gridTopY + (drawCropMarks ? markDistance + markLength : 0) + 10;
        const labelXPos = startX - (drawCropMarks ? markDistance + markLength : 0) - 10;

        const outsText = outsCount === 1 ? "1 out" : `${outsCount} outs`;
        currentOutsString = outsText;

        for (let p = 0; p < pageCount; p += 2) {
            const sheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
            const frontPage = embeddedPages[p];
            const backPage = (p + 1 < pageCount) ? embeddedPages[p + 1] : frontPage;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cellX = startX + c * (itemW + centerGutter);
                    const cellY = startY + (rows - 1 - r) * (itemH + centerGutter);

                    const isLeftHalf = (c < cols / 2);
                    const pageToDraw = isLeftHalf ? frontPage : backPage;
                    
                    let drawX = cellX;
                    let drawY = cellY;
                    let rotation = degrees(0);

                    if (isLeftHalf && doRotatePages) {
                        rotation = degrees(180);
                        drawX = cellX + itemW;
                        drawY = cellY + itemH;
                    }

                    sheet.drawPage(pageToDraw, { x: drawX, y: drawY, xScale: 1, yScale: 1, rotate: rotation });
                }
            }

            if (drawCropMarks) {
                const markColor = rgb(0, 0, 0);
                drawGridCropMarks(sheet, startX, startY, cols, rows, itemW, itemH, trimW, trimH, activeBleedLR, activeBleedTB, centerGutter, markLength, markDistance, markThickness, markColor);
            }
            
            const wtPrefix = `Work & Turn [Pages ${p+1} & ${Math.min(p+2, pageCount)}]`;
            const docLabel = includeFilename ? `${wtPrefix} - ${originalFileName}` : "";
            const docLabelLeft = includeFilenameLeft ? `${wtPrefix} - ${originalFileName}` : "";
            
            drawImpositionLabel(sheet, docLabel, helveticaFont, finalSheetWidth, labelYPos, outsText);
            drawLeftImpositionLabel(sheet, docLabelLeft, helveticaFont, finalSheetHeight, labelXPos, outsText);
        }
    }
    else if (impositionMode === 'sanaol') {
        const embeddedPages = await newPdf.embedPdf(originalPdf, originalPdf.getPageIndices());
        if (embeddedPages.length === 0) return;
        
        const firstPage = embeddedPages[0];
        const activeBleedLR = (bleedType === 'fixed') ? bleedLR : 0;
        const activeBleedTB = (bleedType === 'fixed') ? bleedTB : 0;

        const itemW = firstPage.width;
        const itemH = firstPage.height;

        const trimW = itemW - (2 * activeBleedLR);
        const trimH = itemH - (2 * activeBleedTB);

        const availW = finalSheetWidth - (2 * marginLeft);
        const availH = finalSheetHeight - (2 * marginTop);

        let cols = Math.floor((availW + centerGutter) / (itemW + centerGutter));
        let rows = Math.floor((availH + centerGutter) / (itemH + centerGutter));

        cols = Math.max(1, cols);
        rows = Math.max(1, rows);
        const cellsPerSheet = cols * rows;
        
        const outsCount = cellsPerSheet;

        const totalGridWidth = (cols * itemW) + ((cols - 1) * centerGutter);
        const totalGridHeight = (rows * itemH) + ((rows - 1) * centerGutter);

        const startX = centerOutput ? (finalSheetWidth - totalGridWidth) / 2 : marginLeft;
        const startY = centerOutput ? (finalSheetHeight - totalGridHeight) / 2 : (finalSheetHeight - marginTop - totalGridHeight);

        const gridTopY = startY + (rows * itemH) + ((rows - 1) * centerGutter);
        const labelYPos = gridTopY + (drawCropMarks ? markDistance + markLength : 0) + 10;
        const labelXPos = startX - (drawCropMarks ? markDistance + markLength : 0) - 10;

        const outsText = outsCount === 1 ? "1 kind" : `${outsCount} kinds`;
        currentOutsString = outsText;

        let currentSheet = null;

        for (let p = 0; p < pageCount; p++) {
            const sheetIndex = Math.floor(p / cellsPerSheet);
            const cellIndex = p % cellsPerSheet;
            
            if (cellIndex === 0) {
                currentSheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
                
                if (drawCropMarks) {
                    const markColor = rgb(0, 0, 0);
                    drawGridCropMarks(currentSheet, startX, startY, cols, rows, itemW, itemH, trimW, trimH, activeBleedLR, activeBleedTB, centerGutter, markLength, markDistance, markThickness, markColor);
                }
                
                const sanaPrefix = `Contact Sheet [Sheet ${sheetIndex + 1}]`;
                const docLabel = includeFilename ? `${sanaPrefix} - ${originalFileName}` : "";
                const docLabelLeft = includeFilenameLeft ? `${sanaPrefix} - ${originalFileName}` : "";
                
                drawImpositionLabel(currentSheet, docLabel, helveticaFont, finalSheetWidth, labelYPos, outsText);
                drawLeftImpositionLabel(currentSheet, docLabelLeft, helveticaFont, finalSheetHeight, labelXPos, outsText);
            }
            
            const r = Math.floor(cellIndex / cols);
            const c = cellIndex % cols;
            
            const cellX = startX + c * (itemW + centerGutter);
            const cellY = startY + (rows - 1 - r) * (itemH + centerGutter);

            currentSheet.drawPage(embeddedPages[p], { x: cellX, y: cellY, xScale: 1, yScale: 1 });
        }
    }
    else if (impositionMode === 'saddle') {
        const remainder = pageCount % 4;
        if (remainder !== 0) {
            const pagesToAdd = 4 - remainder;
            for (let i = 0; i < pagesToAdd; i++) { originalPdf.addPage(); }
            pageCount += pagesToAdd;
        }

        const totalSheets = pageCount / 4;
        const freshlyEmbeddedPages = await newPdf.embedPdf(originalPdf, originalPdf.getPageIndices());

        for (let s = 0; s < totalSheets; s++) {
            const frontLeftIndex = pageCount - 1 - (2 * s);
            const frontRightIndex = 2 * s;
            const backLeftIndex = (2 * s) + 1;
            const backRightIndex = pageCount - 2 - (2 * s);
            
            const docLabel = includeFilename ? originalFileName : "";
            const docLabelLeft = includeFilenameLeft ? originalFileName : "";

            const frontSheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
            placePagesOnSheet( frontSheet, freshlyEmbeddedPages[frontLeftIndex], freshlyEmbeddedPages[frontRightIndex], finalSheetWidth, finalSheetHeight, drawCropMarks, markLength, markThickness, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docLabel, docLabelLeft, helveticaFont, parsedDashArray );

            const backSheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
            placePagesOnSheet( backSheet, freshlyEmbeddedPages[backLeftIndex], freshlyEmbeddedPages[backRightIndex], finalSheetWidth, finalSheetHeight, drawCropMarks, markLength, markThickness, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docLabel, docLabelLeft, helveticaFont, parsedDashArray );
        }
    }
    else if (impositionMode === 'perfect16') {
        const remainder = pageCount % 4;
        if (remainder !== 0) {
            const pagesToAdd = 4 - remainder;
            for (let i = 0; i < pagesToAdd; i++) { originalPdf.addPage(); }
            pageCount += pagesToAdd;
        }

        const freshlyEmbeddedPages = await newPdf.embedPdf(originalPdf, originalPdf.getPageIndices());
        let chunkStart = 0;

        while (chunkStart < pageCount) {
            const remainingPages = pageCount - chunkStart;
            const chunkPageCount = remainingPages >= 16 ? 16 : remainingPages; 
            const chunkSheets = chunkPageCount / 4;

            for (let s = 0; s < chunkSheets; s++) {
                const localFrontLeft = chunkPageCount - 1 - (2 * s);
                const localFrontRight = 2 * s;
                const localBackLeft = (2 * s) + 1;
                const localBackRight = chunkPageCount - 2 - (2 * s);

                const frontLeftIndex = chunkStart + localFrontLeft;
                const frontRightIndex = chunkStart + localFrontRight;
                const backLeftIndex = chunkStart + localBackLeft;
                const backRightIndex = chunkStart + localBackRight;
                
                const docLabel = includeFilename ? originalFileName : "";
                const docLabelLeft = includeFilenameLeft ? originalFileName : "";

                const frontSheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
                placePagesOnSheet( frontSheet, freshlyEmbeddedPages[frontLeftIndex], freshlyEmbeddedPages[frontRightIndex], finalSheetWidth, finalSheetHeight, drawCropMarks, markLength, markThickness, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docLabel, docLabelLeft, helveticaFont, parsedDashArray );

                const backSheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
                placePagesOnSheet( backSheet, freshlyEmbeddedPages[backLeftIndex], freshlyEmbeddedPages[backRightIndex], finalSheetWidth, finalSheetHeight, drawCropMarks, markLength, markThickness, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docLabel, docLabelLeft, helveticaFont, parsedDashArray );
            }
            chunkStart += chunkPageCount;
        }
    }

    if (doRotateOutput) {
        const finalPages = newPdf.getPages();
        finalPages.forEach(page => { page.setRotation(degrees(-90)); });
    }

    return await newPdf.save();
}

function drawImpositionLabel(sheet, docName, font, sheetW, targetY, outsString = null) {
    if (!docName) return; 

    const { rgb } = PDFLib;
    const dateStr = `   ${new Date().toLocaleDateString()}`;
    const fontSize = 12;
    
    const nameWidth = font.widthOfTextAtSize(docName, fontSize);
    
    let outsStr = "";
    let outsWidth = 0;
    if (outsString) {
        outsStr = `   (${outsString})`;
        outsWidth = font.widthOfTextAtSize(outsStr, fontSize);
    }
    
    const dateWidth = font.widthOfTextAtSize(dateStr, fontSize);
    const totalWidth = nameWidth + outsWidth + dateWidth;
    const startX = (sheetW - totalWidth) / 2;
    const safeYPos = Math.min(targetY, sheet.getHeight() - fontSize - 5);
    
    sheet.drawText(docName, { x: startX, y: safeYPos, size: fontSize, font: font, color: rgb(0, 0, 0) });
    
    if (outsString) {
        sheet.drawText(outsStr, { x: startX + nameWidth, y: safeYPos, size: fontSize, font: font, color: rgb(0, 0.6, 0) });
    }
    
    sheet.drawText(dateStr, { x: startX + nameWidth + outsWidth, y: safeYPos, size: fontSize, font: font, color: rgb(1, 0, 0) });
}

function drawLeftImpositionLabel(sheet, docName, font, sheetH, targetX, outsString = null) {
    if (!docName) return;

    const { rgb, degrees } = PDFLib;
    const dateStr = `   ${new Date().toLocaleDateString()}`;
    const fontSize = 12;

    const nameWidth = font.widthOfTextAtSize(docName, fontSize);
    let outsStr = "";
    let outsWidth = 0;
    if (outsString) {
        outsStr = `   (${outsString})`;
        outsWidth = font.widthOfTextAtSize(outsStr, fontSize);
    }
    const dateWidth = font.widthOfTextAtSize(dateStr, fontSize);

    const totalWidth = nameWidth + outsWidth + dateWidth;
    const startY = (sheetH - totalWidth) / 2;
    const safeXPos = Math.max(targetX, fontSize + 5); 

    sheet.drawText(docName, { x: safeXPos, y: startY, size: fontSize, font: font, color: rgb(0, 0, 0), rotate: degrees(90) });

    if (outsString) {
        sheet.drawText(outsStr, { x: safeXPos, y: startY + nameWidth, size: fontSize, font: font, color: rgb(0, 0.6, 0), rotate: degrees(90) });
    }

    sheet.drawText(dateStr, { x: safeXPos, y: startY + nameWidth + outsWidth, size: fontSize, font: font, color: rgb(1, 0, 0), rotate: degrees(90) });
}

function drawGridCropMarks(sheet, startX, startY, cols, rows, itemW, itemH, trimW, trimH, activeBleedLR, activeBleedTB, centerGutter, length, distance, thickness, color) {
    const gridLeftX = startX;
    const gridRightX = startX + (cols * itemW) + ((cols - 1) * centerGutter);
    const gridBottomY = startY;
    const gridTopY = startY + (rows * itemH) + ((rows - 1) * centerGutter);

    sheet.drawRectangle({
        x: gridLeftX - distance - length,
        y: gridBottomY - distance - length,
        width: (gridRightX - gridLeftX) + 2 * (distance + length),
        height: (gridTopY - gridBottomY) + 2 * (distance + length),
        borderWidth: thickness,
        borderColor: color
    });

    for (let c = 0; c < cols; c++) {
        const cellX = startX + c * (itemW + centerGutter);
        const trimLeftX = cellX + activeBleedLR;
        const trimRightX = trimLeftX + trimW;

        sheet.drawLine({ start: { x: trimLeftX, y: gridBottomY - distance }, end: { x: trimLeftX, y: gridBottomY - distance - length }, thickness, color });
        sheet.drawLine({ start: { x: trimRightX, y: gridBottomY - distance }, end: { x: trimRightX, y: gridBottomY - distance - length }, thickness, color });

        sheet.drawLine({ start: { x: trimLeftX, y: gridTopY + distance }, end: { x: trimLeftX, y: gridTopY + distance + length }, thickness, color });
        sheet.drawLine({ start: { x: trimRightX, y: gridTopY + distance }, end: { x: trimRightX, y: gridTopY + distance + length }, thickness, color });
    }

    for (let r = 0; r < rows; r++) {
        const cellY = startY + r * (itemH + centerGutter);
        const trimBottomY = cellY + activeBleedTB;
        const trimTopY = trimBottomY + trimH;

        sheet.drawLine({ start: { x: gridLeftX - distance, y: trimBottomY }, end: { x: gridLeftX - distance - length, y: trimBottomY }, thickness, color });
        sheet.drawLine({ start: { x: gridLeftX - distance, y: trimTopY }, end: { x: gridLeftX - distance - length, y: trimTopY }, thickness, color });

        sheet.drawLine({ start: { x: gridRightX + distance, y: trimBottomY }, end: { x: gridRightX + distance + length, y: trimBottomY }, thickness, color });
        sheet.drawLine({ start: { x: gridRightX + distance, y: trimTopY }, end: { x: gridRightX + distance + length, y: trimTopY }, thickness, color });
    }
}

function placePagesOnSheet(sheet, leftPageData, rightPageData, sheetW, sheetH, doCropMarks, markLen, markThick, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docName, docNameLeft, font, parsedDashArray) {
    const { pushGraphicsState, popGraphicsState, moveTo, lineTo, clip, endPath } = PDFLib;
    
    const targetW = sheetW / 2;
    const targetH = sheetH;

    let scaleLeft = 1;
    let scaleRight = 1;

    if (doAutoscale) {
        scaleLeft = Math.min(targetW / leftPageData.width, targetH / leftPageData.height);
        scaleRight = Math.min(targetW / rightPageData.width, targetH / rightPageData.height);
    }

    const leftW = leftPageData.width * scaleLeft;
    const leftH = leftPageData.height * scaleLeft;
    const rightW = rightPageData.width * scaleRight;
    const rightH = rightPageData.height * scaleRight;

    const activeBleedLR_L = (bleedType === 'fixed') ? bleedLR * scaleLeft : 0;
    const activeBleedTB_L = (bleedType === 'fixed') ? bleedTB * scaleLeft : 0;
    const activeBleedLR_R = (bleedType === 'fixed') ? bleedLR * scaleRight : 0;
    const activeBleedTB_R = (bleedType === 'fixed') ? bleedTB * scaleRight : 0;

    const leftTrimW = leftW - (2 * activeBleedLR_L);
    const leftTrimH = leftH - (2 * activeBleedTB_L);
    const rightTrimW = rightW - (2 * activeBleedLR_R);
    const rightTrimH = rightH - (2 * activeBleedTB_R);

    const spineX = sheetW / 2;
    const sheetCenterY = sheetH / 2;

    const leftTrimX = spineX - leftTrimW;
    const leftTrimY = sheetCenterY - (leftTrimH / 2);
    
    const rightTrimX = spineX;
    const rightTrimY = sheetCenterY - (rightTrimH / 2);

    const leftXOffset = leftTrimX - activeBleedLR_L;
    const leftYOffset = leftTrimY - activeBleedTB_L;
    
    const rightXOffset = rightTrimX - activeBleedLR_R;
    const rightYOffset = rightTrimY - activeBleedTB_R;

    if (pushGraphicsState) {
        sheet.pushOperators( pushGraphicsState(), moveTo(0, 0), lineTo(spineX, 0), lineTo(spineX, sheetH), lineTo(0, sheetH), clip(), endPath() );
    }
    sheet.drawPage(leftPageData, { x: leftXOffset, y: leftYOffset, xScale: scaleLeft, yScale: scaleLeft });
    if (popGraphicsState) sheet.pushOperators(popGraphicsState());

    if (pushGraphicsState) {
        sheet.pushOperators( pushGraphicsState(), moveTo(spineX, 0), lineTo(sheetW, 0), lineTo(sheetW, sheetH), lineTo(spineX, sheetH), clip(), endPath() );
    }
    sheet.drawPage(rightPageData, { x: rightXOffset, y: rightYOffset, xScale: scaleRight, yScale: scaleRight });
    if (popGraphicsState) sheet.pushOperators(popGraphicsState());

    const spreadTrimX = leftTrimX;
    const spreadTrimY = leftTrimY; 
    const spreadTrimW = leftTrimW + rightTrimW;
    const spreadTrimH = leftTrimH;

    if (doCropMarks) {
        const markColor = rgb(0, 0, 0); 
        drawSaddleStitchCropMarks(sheet, spreadTrimX, spreadTrimY, spreadTrimW, spreadTrimH, spineX, markLen, markDistance, markThick, markColor, parsedDashArray);
    }
    
    const labelYPos = spreadTrimY + spreadTrimH + (doCropMarks ? markDistance + markLen : 0) + 10;
    const labelXPos = spreadTrimX - (doCropMarks ? markDistance + markLen : 0) - 10;
    
    drawImpositionLabel(sheet, docName, font, sheetW, labelYPos);
    drawLeftImpositionLabel(sheet, docNameLeft, font, sheetH, labelXPos);
}

function drawSaddleStitchCropMarks(sheet, x, y, w, h, spineX, length, distance, thickness, color, dashArray) {
    sheet.drawRectangle({
        x: x - distance - length,
        y: y - distance - length,
        width: w + 2 * (distance + length),
        height: h + 2 * (distance + length),
        borderWidth: thickness,
        borderColor: color
    });

    sheet.drawLine({ start: { x: x, y: y + h + distance }, end: { x: x, y: y + h + distance + length }, thickness, color });
    sheet.drawLine({ start: { x: x - distance, y: y + h }, end: { x: x - distance - length, y: y + h }, thickness, color });
    
    sheet.drawLine({ start: { x: x + w, y: y + h + distance }, end: { x: x + w, y: y + h + distance + length }, thickness, color });
    sheet.drawLine({ start: { x: x + w + distance, y: y + h }, end: { x: x + w + distance + length, y: y + h }, thickness, color });
    
    sheet.drawLine({ start: { x: x, y: y - distance }, end: { x: x, y: y - distance - length }, thickness, color });
    sheet.drawLine({ start: { x: x - distance, y: y }, end: { x: x - distance - length, y: y }, thickness, color });
    
    sheet.drawLine({ start: { x: x + w, y: y - distance }, end: { x: x + w, y: y - distance - length }, thickness, color });
    sheet.drawLine({ start: { x: x + w + distance, y: y }, end: { x: x + w + distance + length, y: y }, thickness, color });

    // Replaced hardcoded array with the dynamic `dashArray` input parameter
    sheet.drawLine({ start: { x: spineX, y: y + h + distance }, end: { x: spineX, y: y + h + distance + length }, thickness, color, dashArray });
    sheet.drawLine({ start: { x: spineX, y: y - distance }, end: { x: spineX, y: y - distance - length }, thickness, color, dashArray });
}