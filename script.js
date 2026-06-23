// --- Supabase Database Configuration ---
const SUPABASE_URL = 'https://tupqynbbkurobnijlfhu.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cHF5bmJia3Vyb2JuaWpsZmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTUyMjAsImV4cCI6MjA5NjUzMTIyMH0.NBFIRMmB92E4icvEEdEiJJFDBOBYtYar1NUMn4RYxa8'; 
const supabase1 = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Application State ---
let currentPdfBlobUrl = null;
let originalPdfBuffer = null; 
let originalFileName = "imposed_document.pdf";
let isSignUpMode = false;

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const fileInput = document.getElementById('pdfInput');
    const statusMessage = document.getElementById('statusMessage');
    const pdfPreview = document.getElementById('pdfPreview');
    const placeholderText = document.getElementById('placeholderText');

    // Auth & Layout Elements
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    const navActions = document.getElementById('navActions');
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

    // Sidebar Tab UI Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panelSidebar = document.getElementById('panelSidebar');
    const panelTitle = document.getElementById('panelTitle');
    const tabContents = document.querySelectorAll('.tab-content');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const saddleOnlyRows = document.querySelectorAll('.layout-saddle-only');

    // --- Sidebar Panel Logic ---
    const closeSidebar = () => {
        panelSidebar.classList.add('closed');
        tabBtns.forEach(btn => btn.classList.remove('active'));
    };

    closePanelBtn.addEventListener('click', closeSidebar);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            
            // If already active, toggle it closed to give canvas max width
            if (btn.classList.contains('active')) {
                closeSidebar();
                return;
            }
            
            // Make clicked tab active
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Open Panel
            panelSidebar.classList.remove('closed');
            
            // Show corresponding content
            tabContents.forEach(tc => tc.classList.remove('active-tab'));
            document.getElementById(targetId).classList.add('active-tab');
            
            // Update Title Header
            panelTitle.textContent = btn.getAttribute('title');
        });
    });


    // --- Authentication Workflow ---

    // Monitor Auth Changes (Switches screens automatically when session changes)
    supabase1.auth.onAuthStateChange((event, session) => {
        if (session) {
            authScreen.style.display = 'none';
            mainApp.style.display = 'block';
            navActions.style.display = 'flex'; // Reveal top actions
            authError.textContent = '';
            authForm.reset();
            
            // Displays current authenticated session email on logout button
            if (session.user && session.user.email) {
                logoutBtn.textContent = `Logout ${session.user.email}`;
            }
        } else {
            authScreen.style.display = 'flex';
            mainApp.style.display = 'none';
            navActions.style.display = 'none'; // Hide top actions
            clearPdfState();
            logoutBtn.textContent = 'Logout';
        }
    });

    // Toggle between Login and Sign Up UI modes
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

    // Handle Auth Form Submit (Login or Registration)
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
                authError.style.color = '#4CAF50';
                authError.textContent = 'Registration successful! Check your email to confirm.';
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

    // Handle Logout Event
    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase1.auth.signOut();
        if (error) console.error("Error signing out:", error.message);
    });

    // Helper to purge PDF memory/DOM elements on logout
    function clearPdfState() {
        if (currentPdfBlobUrl) {
            URL.revokeObjectURL(currentPdfBlobUrl);
        }
        currentPdfBlobUrl = null;
        originalPdfBuffer = null;
        pdfPreview.src = '';
        pdfPreview.style.display = "none";
        placeholderText.style.display = "block";
        downloadBtn.style.display = "none";
        statusMessage.textContent = '';
        fileInput.value = '';
    }

    // Toggle contextual UI options based on Imposition type selection
    function updateImpositionUiContext() {
        const mode = document.querySelector('input[name="impositionMode"]:checked').value;
        const saddleTabBtn = document.getElementById('saddleTabBtn');

        if (mode === 'multiout' || mode === 'workandturn' || mode === 'sanaol') {
            saddleTabBtn.style.display = 'none'; // Hide the Saddle Book Binding Icon Tab completely
            saddleOnlyRows.forEach(el => el.style.display = 'none');
            
            // Auto switch tabs if user is actively looking at a tab we just hid
            if (saddleTabBtn.classList.contains('active')) {
                document.querySelector('.tab-btn[data-target="modeGroup"]').click();
            }
        } else {
            saddleTabBtn.style.display = 'flex'; // Reveal the Icon Tab
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
            pdfPreview.style.display = "block";
            pdfPreview.src = currentPdfBlobUrl;

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

    // --- Core Processing Event Listeners ---
    fileInput.addEventListener('change', async (e) => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            originalFileName = file.name;
            originalPdfBuffer = await file.arrayBuffer();
            generatePreview();
        }
    });

    generateBtn.addEventListener('click', generatePreview);

    // Listens to all settings changing inside the mainApp environment
    const sidebarInputs = document.querySelectorAll('#mainApp input');
    sidebarInputs.forEach(input => {
        if (input.name === 'impositionMode') {
            input.addEventListener('change', () => {
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
        a.download = `Imposed_${originalFileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    updateImpositionUiContext();
});

// --- Mathematical Imposition Functions ---

async function createImposedPDF(inputPdfBuffer) {
    const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib; 
    const in2pt = 72; // Convert inches to points
    
    // Gather General UI Settings
    const impositionMode = document.querySelector('input[name="impositionMode"]:checked').value;
    const paperWidth = parseFloat(document.getElementById('paperWidth').value) * in2pt;
    const paperHeight = parseFloat(document.getElementById('paperHeight').value) * in2pt;
    const isLandscape = document.getElementById('landscape').checked;
    const doAutoscale = document.getElementById('autoscale').checked;
    const doRotatePages = document.getElementById('rotatePages').checked; 
    const doRotateOutput = document.getElementById('rotateOutput').checked;
    const includeFilename = document.getElementById('includeFilename').checked;
    const includeFilenameLeft = document.getElementById('includeFilenameLeft').checked;
    
    // Gather Mark & White Space Settings
    const drawCropMarks = document.getElementById('drawCropMarks').checked;
    const markLength = parseFloat(document.getElementById('markLength').value) * in2pt;
    const markThickness = parseFloat(document.getElementById('markThickness').value) * in2pt;
    const markDistance = parseFloat(document.getElementById('markDistance').value) * in2pt; 
    const marginLeft = parseFloat(document.getElementById('marginLeft').value) * in2pt;
    const marginTop = parseFloat(document.getElementById('marginTop').value) * in2pt;
    const centerGutter = parseFloat(document.getElementById('centerGutter').value) * in2pt;
    const centerOutput = document.getElementById('centerOutput').checked;
    
    // Gather Bleed Settings
    const bleedType = document.querySelector('input[name="bleedType"]:checked').value;
    const bleedLR = parseFloat(document.getElementById('bleedLR').value) * in2pt;
    const bleedTB = parseFloat(document.getElementById('bleedTB').value) * in2pt;

    const finalSheetWidth = isLandscape ? Math.max(paperWidth, paperHeight) : Math.min(paperWidth, paperHeight);
    const finalSheetHeight = isLandscape ? Math.min(paperWidth, paperHeight) : Math.max(paperWidth, paperHeight);

    let originalPdf = await PDFDocument.load(inputPdfBuffer);
    
    // --- BAKE ROTATION INTO SOURCE PDF FIRST ---
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
    
    // Embed the standard font for printing the label
    const helveticaFont = await newPdf.embedFont(StandardFonts.Helvetica);
    
    let pageCount = originalPdf.getPageCount();

    // --- MODE 1: MULTI-OUT GRID ARRANGEMENT ENGINE ---
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

        // Compute Outs Count
        const outsCount = cols * rows;

        const totalGridWidth = (cols * itemW) + ((cols - 1) * centerGutter);
        const totalGridHeight = (rows * itemH) + ((rows - 1) * centerGutter);

        const startX = centerOutput ? (finalSheetWidth - totalGridWidth) / 2 : marginLeft;
        const startY = centerOutput ? (finalSheetHeight - totalGridHeight) / 2 : (finalSheetHeight - marginTop - totalGridHeight);

        // Determine where to place the label (just above the imposition layout bounds)
        const gridTopY = startY + (rows * itemH) + ((rows - 1) * centerGutter);
        const labelYPos = gridTopY + (drawCropMarks ? markDistance + markLength : 0) + 10;
        const labelXPos = startX - (drawCropMarks ? markDistance + markLength : 0) - 10;

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
            drawImpositionLabel(sheet, docLabel, helveticaFont, finalSheetWidth, labelYPos, outsCount);
            drawLeftImpositionLabel(sheet, docLabelLeft, helveticaFont, finalSheetHeight, labelXPos, outsCount);
        }
    } 
    // --- MODE 1.5: WORK & TURN ENGINE ---
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

        // Enforce an even number of columns to split left and right symmetrically
        cols = Math.floor(cols / 2) * 2;
        rows = Math.max(1, rows);

        if (cols < 2) {
            throw new Error("Paper size is too small for Work & Turn layouts. Increase width to fit at least 2 columns.");
        }
        
        // Compute Outs Count
        const outsCount = cols * rows;

        const totalGridWidth = (cols * itemW) + ((cols - 1) * centerGutter);
        const totalGridHeight = (rows * itemH) + ((rows - 1) * centerGutter);

        const startX = centerOutput ? (finalSheetWidth - totalGridWidth) / 2 : marginLeft;
        const startY = centerOutput ? (finalSheetHeight - totalGridHeight) / 2 : (finalSheetHeight - marginTop - totalGridHeight);

        const gridTopY = startY + (rows * itemH) + ((rows - 1) * centerGutter);
        const labelYPos = gridTopY + (drawCropMarks ? markDistance + markLength : 0) + 10;
        const labelXPos = startX - (drawCropMarks ? markDistance + markLength : 0) - 10;

        // Process document in consecutive front/back pairs
        for (let p = 0; p < pageCount; p += 2) {
            const sheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
            const frontPage = embeddedPages[p];
            const backPage = (p + 1 < pageCount) ? embeddedPages[p + 1] : frontPage;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cellX = startX + c * (itemW + centerGutter);
                    const cellY = startY + (rows - 1 - r) * (itemH + centerGutter);

                    // Symmetrical split: Left half gets the Front page, Right half gets the Back page
                    const isLeftHalf = (c < cols / 2);
                    const pageToDraw = isLeftHalf ? frontPage : backPage;
                    
                    let drawX = cellX;
                    let drawY = cellY;
                    let rotation = degrees(0);

                    // Rotate the left half 180 degrees ONLY if the 'rotate source pages' setting is checked
                    if (isLeftHalf && doRotatePages) {
                        rotation = degrees(180);
                        // Offset the anchor point for a 180-degree rotation from bottom-left origin
                        drawX = cellX + itemW;
                        drawY = cellY + itemH;
                    }

                    sheet.drawPage(pageToDraw, {
                        x: drawX,
                        y: drawY,
                        xScale: 1,
                        yScale: 1,
                        rotate: rotation
                    });
                }
            }

            if (drawCropMarks) {
                const markColor = rgb(0, 0, 0);
                drawGridCropMarks(sheet, startX, startY, cols, rows, itemW, itemH, trimW, trimH, activeBleedLR, activeBleedTB, centerGutter, markLength, markDistance, markThickness, markColor);
            }
            
            const wtPrefix = `Work & Turn [Pages ${p+1} & ${Math.min(p+2, pageCount)}]`;
            const docLabel = includeFilename ? `${wtPrefix} - ${originalFileName}` : "";
            const docLabelLeft = includeFilenameLeft ? `${wtPrefix} - ${originalFileName}` : "";
            drawImpositionLabel(sheet, docLabel, helveticaFont, finalSheetWidth, labelYPos, outsCount);
            drawLeftImpositionLabel(sheet, docLabelLeft, helveticaFont, finalSheetHeight, labelXPos, outsCount);
        }
    }
    // --- MODE 1.8: SANA OL (CONTACT Sheet) ENGINE ---
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
        
        // Compute Outs Count
        const outsCount = cellsPerSheet;

        const totalGridWidth = (cols * itemW) + ((cols - 1) * centerGutter);
        const totalGridHeight = (rows * itemH) + ((rows - 1) * centerGutter);

        const startX = centerOutput ? (finalSheetWidth - totalGridWidth) / 2 : marginLeft;
        const startY = centerOutput ? (finalSheetHeight - totalGridHeight) / 2 : (finalSheetHeight - marginTop - totalGridHeight);

        const gridTopY = startY + (rows * itemH) + ((rows - 1) * centerGutter);
        const labelYPos = gridTopY + (drawCropMarks ? markDistance + markLength : 0) + 10;
        const labelXPos = startX - (drawCropMarks ? markDistance + markLength : 0) - 10;

        let currentSheet = null;

        for (let p = 0; p < pageCount; p++) {
            const sheetIndex = Math.floor(p / cellsPerSheet);
            const cellIndex = p % cellsPerSheet;
            
            if (cellIndex === 0) {
                currentSheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
                
                if (drawCropMarks) {
                    const markColor = rgb(0, 0, 0);
                    // Draw marks outlining the full standard grid structure for clean trimming
                    drawGridCropMarks(currentSheet, startX, startY, cols, rows, itemW, itemH, trimW, trimH, activeBleedLR, activeBleedTB, centerGutter, markLength, markDistance, markThickness, markColor);
                }
                
                const sanaPrefix = `Contact Sheet [Sheet ${sheetIndex + 1}]`;
                const docLabel = includeFilename ? `${sanaPrefix} - ${originalFileName}` : "";
                const docLabelLeft = includeFilenameLeft ? `${sanaPrefix} - ${originalFileName}` : "";
                drawImpositionLabel(currentSheet, docLabel, helveticaFont, finalSheetWidth, labelYPos, outsCount);
                drawLeftImpositionLabel(currentSheet, docLabelLeft, helveticaFont, finalSheetHeight, labelXPos, outsCount);
            }
            
            const r = Math.floor(cellIndex / cols);
            const c = cellIndex % cols;
            
            const cellX = startX + c * (itemW + centerGutter);
            const cellY = startY + (rows - 1 - r) * (itemH + centerGutter);

            currentSheet.drawPage(embeddedPages[p], {
                x: cellX,
                y: cellY,
                xScale: 1,
                yScale: 1
            });
        }
    }
    // --- MODE 2: SADDLE STITCH BOOKLET ENGINE ---
    else if (impositionMode === 'saddle') {
        const remainder = pageCount % 4;
        if (remainder !== 0) {
            const pagesToAdd = 4 - remainder;
            for (let i = 0; i < pagesToAdd; i++) {
                originalPdf.addPage();
            }
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
            placePagesOnSheet( frontSheet, freshlyEmbeddedPages[frontLeftIndex], freshlyEmbeddedPages[frontRightIndex], finalSheetWidth, finalSheetHeight, drawCropMarks, markLength, markThickness, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docLabel, docLabelLeft, helveticaFont );

            const backSheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
            placePagesOnSheet( backSheet, freshlyEmbeddedPages[backLeftIndex], freshlyEmbeddedPages[backRightIndex], finalSheetWidth, finalSheetHeight, drawCropMarks, markLength, markThickness, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docLabel, docLabelLeft, helveticaFont );
        }
    }
    // --- MODE 3: PERFECT BIND (16-PAGE SIGNATURES ENGINE) ---
    else if (impositionMode === 'perfect16') {
        const remainder = pageCount % 4;
        if (remainder !== 0) {
            const pagesToAdd = 4 - remainder;
            for (let i = 0; i < pagesToAdd; i++) {
                originalPdf.addPage();
            }
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
                placePagesOnSheet( frontSheet, freshlyEmbeddedPages[frontLeftIndex], freshlyEmbeddedPages[frontRightIndex], finalSheetWidth, finalSheetHeight, drawCropMarks, markLength, markThickness, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docLabel, docLabelLeft, helveticaFont );

                const backSheet = newPdf.addPage([finalSheetWidth, finalSheetHeight]);
                placePagesOnSheet( backSheet, freshlyEmbeddedPages[backLeftIndex], freshlyEmbeddedPages[backRightIndex], finalSheetWidth, finalSheetHeight, drawCropMarks, markLength, markThickness, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docLabel, docLabelLeft, helveticaFont );
            }
            chunkStart += chunkPageCount;
        }
    }

    // --- BAKE IN FINAL SHEET ROTATION BEFORE EXPORT ---
    if (doRotateOutput) {
        const finalPages = newPdf.getPages();
        finalPages.forEach(page => {
            page.setRotation(degrees(-90)); 
        });
    }

    return await newPdf.save();
}

// Function to calculate widths and center the document, outs count, and date perfectly
function drawImpositionLabel(sheet, docName, font, sheetW, targetY, outsCount = null) {
    if (!docName) return; 

    const { rgb } = PDFLib;
    const dateStr = `   ${new Date().toLocaleDateString()}`;
    const fontSize = 12;
    
    // Calculate Name Width
    const nameWidth = font.widthOfTextAtSize(docName, fontSize);
    
    // Calculate Outs Text Width (if provided)
    let outsStr = "";
    let outsWidth = 0;
    if (outsCount) {
        outsStr = `   (${outsCount}outs)`;
        outsWidth = font.widthOfTextAtSize(outsStr, fontSize);
    }
    
    // Calculate Date Width
    const dateWidth = font.widthOfTextAtSize(dateStr, fontSize);
    
    // Total combined width for perfectly centering the group
    const totalWidth = nameWidth + outsWidth + dateWidth;
    
    const startX = (sheetW - totalWidth) / 2;
    // Bound check to prevent text from flying off the physical page
    const safeYPos = Math.min(targetY, sheet.getHeight() - fontSize - 5);
    
    // 1. Draw Document Name (Black)
    sheet.drawText(docName, {
        x: startX,
        y: safeYPos,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0)
    });
    
    // 2. Draw Outs Count (Green) - Only displays if mode sends the variable
    if (outsCount) {
        sheet.drawText(outsStr, {
            x: startX + nameWidth,
            y: safeYPos,
            size: fontSize,
            font: font,
            color: rgb(0, 0.6, 0) // Deep Green
        });
    }
    
    // 3. Draw Date String (Red)
    sheet.drawText(dateStr, {
        x: startX + nameWidth + outsWidth,
        y: safeYPos,
        size: fontSize,
        font: font,
        color: rgb(1, 0, 0) // Red
    });
}

// Draw label centered vertically on the left side, rotated 90 degrees CCW
function drawLeftImpositionLabel(sheet, docName, font, sheetH, targetX, outsCount = null) {
    if (!docName) return;

    const { rgb, degrees } = PDFLib;
    const dateStr = `   ${new Date().toLocaleDateString()}`;
    const fontSize = 12;

    const nameWidth = font.widthOfTextAtSize(docName, fontSize);
    let outsStr = "";
    let outsWidth = 0;
    if (outsCount) {
        outsStr = `   (${outsCount}outs)`;
        outsWidth = font.widthOfTextAtSize(outsStr, fontSize);
    }
    const dateWidth = font.widthOfTextAtSize(dateStr, fontSize);

    const totalWidth = nameWidth + outsWidth + dateWidth;

    // Center vertically. 
    // Since we are rotating 90 degrees CCW (bottom to top reading), the drawing starts here and goes upwards
    const startY = (sheetH - totalWidth) / 2;
    
    // Dynamically limit padding so it doesn't get clipped completely off the physical page
    const safeXPos = Math.max(targetX, fontSize + 5); 

    sheet.drawText(docName, {
        x: safeXPos,
        y: startY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
        rotate: degrees(90)
    });

    if (outsCount) {
        sheet.drawText(outsStr, {
            x: safeXPos,
            y: startY + nameWidth,
            size: fontSize,
            font: font,
            color: rgb(0, 0.6, 0),
            rotate: degrees(90)
        });
    }

    sheet.drawText(dateStr, {
        x: safeXPos,
        y: startY + nameWidth + outsWidth,
        size: fontSize,
        font: font,
        color: rgb(1, 0, 0),
        rotate: degrees(90)
    });
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

function placePagesOnSheet(sheet, leftPageData, rightPageData, sheetW, sheetH, doCropMarks, markLen, markThick, markDistance, rgb, doAutoscale, bleedType, bleedLR, bleedTB, docName, docNameLeft, font) {
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
        drawSaddleStitchCropMarks(sheet, spreadTrimX, spreadTrimY, spreadTrimW, spreadTrimH, spineX, markLen, markDistance, markThick, markColor);
    }
    
    const labelYPos = spreadTrimY + spreadTrimH + (doCropMarks ? markDistance + markLen : 0) + 10;
    const labelXPos = spreadTrimX - (doCropMarks ? markDistance + markLen : 0) - 10;
    
    // Draw Both labels (if their respective checkboxes are checked)
    drawImpositionLabel(sheet, docName, font, sheetW, labelYPos);
    drawLeftImpositionLabel(sheet, docNameLeft, font, sheetH, labelXPos);
}

function drawSaddleStitchCropMarks(sheet, x, y, w, h, spineX, length, distance, thickness, color) {
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

    const dashArray = [5, 5]; 
    sheet.drawLine({ start: { x: spineX, y: y + h + distance }, end: { x: spineX, y: y + h + distance + length }, thickness, color, dashArray });
    sheet.drawLine({ start: { x: spineX, y: y - distance }, end: { x: spineX, y: y - distance - length }, thickness, color, dashArray });
}