// Función para cambiar el tema
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

// Cargar tema guardado
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        if (themeToggle) themeToggle.textContent = '🌙';
    }
}

// Cargar tema al iniciar la página
document.addEventListener('DOMContentLoaded', loadTheme);

class LetterExtractor {
    constructor() {
        this.canvas = null;
        this.backgroundImage = null;
        this.rectangles = [];
        this.selectedRect = null;
        this.rectCounter = 0;
        this.alphabets = {
            // Alfabetos modernos
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            mixed: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
            
            // Alfabetos históricos
            hebrew: 'אבגדהוזחטיכלמנסעפצקרשת', // Alefato hebreo (22 letras)
            hebrew_latin: 'ABGDHVZHTYKLMNSPTSQRST', // Transliteración latina del hebreo
            greek: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ', // Griego clásico (24 letras)
            latin_classical: 'ABCDEFGHIKLMNOPQRSTVXYZ', // Latín sin J ni U (23 letras)
            
            // Alfabetos de Tritemius (basados en hebreo pero con variaciones gráficas)
            tritemius_hebrew: 'אבגדהוזחטיכלמנסעפצקרשת',
            tritemius_hebrew_latin: 'ABGDHVZHTYKLMNSPTSQRST', // Versión latina para mejor visualización
            tritemius_chaldean: 'אבגדהוזחטיכלמנסעפצקרשת', // Mismo orden, diferentes glifos
            tritemius_celestial: 'אבגדהוזחטיכלמנסעפצקרשת', // Mismo orden, glifos celestiales
            
            custom: ''
        };
        
        // Nombres en latín para referencia
        this.hebrewNames = [
            'Aleph', 'Beth', 'Gimel', 'Daleth', 'He', 'Vav', 'Zayin', 'Heth', 
            'Teth', 'Yod', 'Kaph', 'Lamed', 'Mem', 'Nun', 'Samekh', 'Ayin', 
            'Pe', 'Tsadi', 'Qoph', 'Resh', 'Shin', 'Tav'
        ];
        
        this.currentAlphabetIndex = 0;
        this.currentImageName = '';
        this.autoPrefix = true;
        
        // Nuevas propiedades para manejo inteligente de recuadros
        this.templateRectangle = null; // Primer rectángulo como template
        this.isGridMode = false; // Modo de generación automática de grid
        this.imageOrientation = 'horizontal'; // 'horizontal' o 'vertical'
        
        this.init();
    }

    init() {
        // Inicializar canvas de Fabric.js
        this.canvas = new fabric.Canvas('canvas', {
            width: 800,
            height: 600,
            backgroundColor: '#f9f9f9'
        });

        // Configurar para dispositivos táctiles
        this.canvas.isDrawingMode = false;
        this.canvas.selection = true;
        this.canvas.interactive = true;
        
        // Configuraciones adicionales para mejorar la interacción
        this.canvas.preserveObjectStacking = true;
        this.canvas.centeredScaling = false;
        this.canvas.centeredRotation = false;
        this.canvas.uniformScaling = false;
        
        // Debug: Verificar configuración inicial
        console.log('🔧 Canvas inicializado:', {
            selection: this.canvas.selection,
            interactive: this.canvas.interactive,
            isDrawingMode: this.canvas.isDrawingMode
        });

        // Event listeners
        this.setupEventListeners();
        
        // Configurar eventos del canvas
        this.setupCanvasEvents();
        
        // Inicializar controles de prefijo
        this.togglePrefixInputs();
    }

    setupEventListeners() {
        // Cargar imagen
        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.loadImage(e.target.files[0]);
        });

        // Añadir recuadro
        document.getElementById('addRectBtn').addEventListener('click', () => {
            this.addRectangle();
        });

        // Generar grid automático
        document.getElementById('generateGridBtn').addEventListener('click', () => {
            this.generateLetterGrid();
        });

        // Test básico de Fabric.js (temporal)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'T' || e.key === 't') {
                this.testBasicRect();
            } else if (e.key === 'R' || e.key === 'r') {
                this.resetCanvas();
            }
        });

        // Borrar seleccionado
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            this.deleteSelected();
        });

        // Reset propiedades del rectángulo seleccionado
        document.getElementById('resetRectBtn').addEventListener('click', () => {
            const activeObject = this.canvas.getActiveObject();
            if (activeObject && activeObject !== this.backgroundImage) {
                this.resetRectangleProperties(activeObject);
            }
        });

        // Guardar JSON
        document.getElementById('saveJsonBtn').addEventListener('click', () => {
            this.saveAsJSON();
        });

        // Procesar imagen
        document.getElementById('processImageBtn').addEventListener('click', () => {
            this.processImage();
        });

        // Limpiar todo
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAll();
        });

        // Cambio de nombre del recuadro seleccionado
        document.getElementById('selectedName').addEventListener('input', (e) => {
            this.updateSelectedName(e.target.value);
        });

        // Cambio de unicode
        document.getElementById('selectedUnicode').addEventListener('input', (e) => {
            this.updateSelectedUnicode(e.target.value);
        });

        // Cambio de tipo de alfabeto
        document.getElementById('alphabetType').addEventListener('change', (e) => {
            this.currentAlphabetIndex = 0; // Reset counter
            this.updateSequenceInfo();
        });

        // Reiniciar secuencia
        document.getElementById('resetSequenceBtn').addEventListener('click', () => {
            this.resetSequence();
        });

        // Auto-prefix toggle
        document.getElementById('autoPrefixCheck').addEventListener('change', (e) => {
            this.autoPrefix = e.target.checked;
            this.togglePrefixInputs();
            this.updateAutoPrefix();
        });

        // Sufijo change
        document.getElementById('suffixInput').addEventListener('input', () => {
            this.updateAutoPrefix();
        });
    }

    setupCanvasEvents() {
        // Selección de objetos
        this.canvas.on('selection:created', (e) => {
            this.handleSelection(e.selected[0]);
        });

        this.canvas.on('selection:updated', (e) => {
            this.handleSelection(e.selected[0]);
        });

        this.canvas.on('selection:cleared', () => {
            this.handleSelectionCleared();
        });

        // Cambios en objetos
        this.canvas.on('object:modified', (e) => {
            this.updateRectangleData(e.target);
        });

        this.canvas.on('object:moving', (e) => {
            this.updateRectangleData(e.target);
        });

        this.canvas.on('object:scaling', (e) => {
            this.updateRectangleData(e.target);
        });

        // Debug: eventos de mouse completos
        this.canvas.on('mouse:down', (e) => {
            console.log('🖱️ Mouse down:', {
                target: e.target ? (e.target.customName || e.target.type) : 'canvas',
                pointer: e.pointer,
                canvasSelection: this.canvas.selection
            });
            
            if (e.target && e.target !== this.backgroundImage) {
                console.log('📋 Propiedades del objeto:', {
                    selectable: e.target.selectable,
                    evented: e.target.evented,
                    hasControls: e.target.hasControls,
                    lockRotation: e.target.lockRotation
                });
            }
        });
        
        this.canvas.on('mouse:move', (e) => {
            if (e.target && e.target !== this.backgroundImage) {
                console.log('🖱️ Mouse move sobre objeto:', e.target.customName || e.target.type);
            }
        });
        
        this.canvas.on('mouse:up', (e) => {
            console.log('🖱️ Mouse up');
        });
    }

    loadImage(file) {
        if (!file) return;

        // Guardar el nombre de la imagen para prefijo automático
        this.currentImageName = file.name;
        this.updateAutoPrefix();

        const reader = new FileReader();
        reader.onload = (e) => {
            const imgElement = new Image();
            imgElement.onload = () => {
                // Limpiar canvas
                this.clearAll();

                // Crear imagen de fondo
                const fabricImage = new fabric.Image(imgElement, {
                    selectable: false,
                    evented: false,
                    centeredScaling: true,
                    excludeFromExport: false,
                    absolutePositioned: true
                });

                // Ajustar tamaño del canvas a la imagen
                const maxWidth = 800;
                const maxHeight = 600;
                const scale = Math.min(maxWidth / imgElement.width, maxHeight / imgElement.height);
                
                const scaledWidth = imgElement.width * scale;
                const scaledHeight = imgElement.height * scale;

                this.canvas.setDimensions({
                    width: scaledWidth,
                    height: scaledHeight
                });

                fabricImage.scale(scale);
                fabricImage.set({
                    left: 0,
                    top: 0
                });

                this.canvas.add(fabricImage);
                this.backgroundImage = fabricImage;
                
                // Asegurar que el canvas esté configurado correctamente después de cargar imagen
                this.canvas.selection = true;
                this.canvas.interactive = true;
                this.canvas.renderAll();

                console.log('🖼️ Imagen cargada - Estado del canvas:', {
                    selection: this.canvas.selection,
                    interactive: this.canvas.interactive,
                    objects: this.canvas.getObjects().length
                });

                // Habilitar controles
                this.enableControls();
                this.updateSequenceInfo();
            };
            imgElement.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    autoDetectLetters() {
        if (!this.backgroundImage) return;

        // Esta función podría usar análisis de imagen para detectar automáticamente letras
        // Por ahora, crear una cuadrícula sugerida
        alert('🤖 Auto-detección en desarrollo. Por ahora, usa "🔤 Añadir Letra" para crear regiones manualmente.');
    }

    getNextLetterName() {
        const alphabetType = document.getElementById('alphabetType').value;
        const namingFormat = document.getElementById('namingFormat').value;
        const prefix = this.generatePrefix(); // Usar el nuevo sistema de prefijos
        const alphabet = this.alphabets[alphabetType];
        
        if (alphabetType === 'custom' || !alphabet) {
            return `${prefix}Letra_${this.rectCounter}`;
        }
        
        if (this.currentAlphabetIndex < alphabet.length) {
            const letter = alphabet[this.currentAlphabetIndex];
            const position = this.currentAlphabetIndex + 1;
            const paddedPosition = String(position).padStart(2, '0');
            
            let fileName = '';
            
            // Determinar el formato según la selección
            if (namingFormat === 'simple') {
                // Formato simple: A, B, C...
                if (alphabetType.includes('hebrew') && !alphabetType.includes('_latin')) {
                    const hebrewName = this.hebrewNames[this.currentAlphabetIndex];
                    fileName = `${prefix}${hebrewName}`;
                } else if (alphabetType.includes('hebrew_latin') || alphabetType.includes('tritemius_hebrew_latin')) {
                    const hebrewName = this.hebrewNames[this.currentAlphabetIndex];
                    fileName = `${prefix}${hebrewName}`;
                } else {
                    fileName = `${prefix}${letter}`;
                }
            } else if (namingFormat === 'numbered') {
                // Formato numerado: 01_A, 02_B...
                if (alphabetType.includes('hebrew') && !alphabetType.includes('_latin')) {
                    fileName = `${prefix}${paddedPosition}_${letter}`;
                } else if (alphabetType.includes('hebrew_latin') || alphabetType.includes('tritemius_hebrew_latin')) {
                    const hebrewName = this.hebrewNames[this.currentAlphabetIndex];
                    fileName = `${prefix}${paddedPosition}_${hebrewName}`;
                } else {
                    fileName = `${prefix}${paddedPosition}_${letter}`;
                }
            } else if (namingFormat === 'descriptive') {
                // Formato descriptivo: 01_Aleph, 02_Beth...
                if (alphabetType.includes('hebrew') || alphabetType.includes('tritemius')) {
                    const hebrewName = this.hebrewNames[this.currentAlphabetIndex];
                    fileName = `${prefix}${paddedPosition}_${hebrewName}`;
                } else {
                    // Para otros alfabetos, usar el nombre del carácter si está disponible
                    fileName = `${prefix}${paddedPosition}_${letter}`;
                }
            }
            
            this.currentAlphabetIndex++;
            this.updateSequenceInfo();
            return fileName;
        } else {
            // Si se acabó el alfabeto, continuar con números
            const extraPosition = String(this.currentAlphabetIndex - alphabet.length + 1).padStart(2, '0');
            this.currentAlphabetIndex++;
            this.updateSequenceInfo();
            return `${prefix}Extra_${extraPosition}`;
        }
    }

    updateSequenceInfo() {
        const alphabetType = document.getElementById('alphabetType').value;
        const alphabet = this.alphabets[alphabetType];
        
        if (alphabet && this.currentAlphabetIndex < alphabet.length) {
            const nextLetter = alphabet[this.currentAlphabetIndex];
            const remaining = alphabet.length - this.currentAlphabetIndex;
            
            // Actualizar o crear info de secuencia
            let sequenceInfo = document.getElementById('sequenceInfo');
            if (!sequenceInfo) {
                sequenceInfo = document.createElement('div');
                sequenceInfo.id = 'sequenceInfo';
                sequenceInfo.className = 'sequence-info';
                document.querySelector('.alphabet-controls').appendChild(sequenceInfo);
            }
            
            // Para alfabetos hebreos, mostrar también el nombre
            if (alphabetType.includes('hebrew') || alphabetType.includes('tritemius')) {
                const hebrewName = this.hebrewNames[this.currentAlphabetIndex];
                sequenceInfo.innerHTML = `📍 Siguiente: <strong>${nextLetter}</strong> (${hebrewName}) | Restantes: ${remaining}`;
            } else {
                sequenceInfo.innerHTML = `📍 Siguiente: <strong>${nextLetter}</strong> | Restantes: ${remaining}`;
            }
        }
    }

    resetSequence() {
        this.currentAlphabetIndex = 0;
        this.updateSequenceInfo();
        
        // Mostrar confirmación
        const sequenceInfo = document.getElementById('sequenceInfo');
        if (sequenceInfo) {
            const originalText = sequenceInfo.innerHTML;
            sequenceInfo.innerHTML = '✅ Secuencia reiniciada';
            sequenceInfo.style.background = '#d4edda';
            sequenceInfo.style.borderColor = '#c3e6cb';
            sequenceInfo.style.color = '#155724';
            
            setTimeout(() => {
                sequenceInfo.innerHTML = originalText;
                sequenceInfo.style.background = '#e8f4fd';
                sequenceInfo.style.borderColor = '#b3d9ff';
                sequenceInfo.style.color = '#0066cc';
            }, 1500);
        }
    }

    updateAutoPrefix() {
        if (!this.autoPrefix || !this.currentImageName) return;
        
        // Extraer nombre base del archivo (sin extensión)
        const baseName = this.currentImageName.replace(/\.[^/.]+$/, '');
        const suffix = document.getElementById('suffixInput').value.trim();
        
        let autoPrefix = baseName;
        if (suffix) {
            autoPrefix += `_${suffix}`;
        }
        autoPrefix += '_extracted_';
        
        // Actualizar el campo de prefijo (para mostrar al usuario)
        const prefixDisplay = document.getElementById('prefixDisplay');
        if (!prefixDisplay) {
            const display = document.createElement('div');
            display.id = 'prefixDisplay';
            display.className = 'sequence-info';
            display.style.marginTop = '10px';
            document.querySelector('.alphabet-controls').appendChild(display);
        }
        
        document.getElementById('prefixDisplay').innerHTML = `🏷️ Prefijo automático: <strong>${autoPrefix}</strong>`;
    }

    togglePrefixInputs() {
        const manualPrefix = document.getElementById('namePrefix');
        const suffixInput = document.getElementById('suffixInput');
        
        if (this.autoPrefix) {
            manualPrefix.disabled = true;
            suffixInput.disabled = false;
            manualPrefix.style.opacity = '0.5';
            suffixInput.style.opacity = '1';
        } else {
            manualPrefix.disabled = false;
            suffixInput.disabled = true;
            manualPrefix.style.opacity = '1';
            suffixInput.style.opacity = '0.5';
        }
    }

    generatePrefix() {
        if (this.autoPrefix && this.currentImageName) {
            const baseName = this.currentImageName.replace(/\.[^/.]+$/, '');
            const suffix = document.getElementById('suffixInput').value.trim();
            
            let autoPrefix = baseName;
            if (suffix) {
                autoPrefix += `_${suffix}`;
            }
            autoPrefix += '_extracted_';
            
            return autoPrefix;
        } else {
            return document.getElementById('namePrefix').value;
        }
    }

    getUnicodeForLetter(letter) {
        if (letter && letter.length === 1) {
            return `U+${letter.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
        }
        return '';
    }

    addRectangle() {
        if (!this.backgroundImage) return;

        this.rectCounter++;
        const letterName = this.getNextLetterName();
        
        // Usar template del primer rectángulo si existe
        let width = 100, height = 100;
        let left = 100;
        let top = 100;
        
        if (this.templateRectangle) {
            width = this.templateRectangle.width * this.templateRectangle.scaleX;
            height = this.templateRectangle.height * this.templateRectangle.scaleY;
            
            // ✅ POSICIONAMIENTO INTELIGENTE 2D - GRID CALCULADO
            const imgWidth = this.backgroundImage.width * this.backgroundImage.scaleX;
            const imgHeight = this.backgroundImage.height * this.backgroundImage.scaleY;
            const imgLeft = this.backgroundImage.left;
            const imgTop = this.backgroundImage.top;
            
            // Espaciado entre rectángulos
            const horizontalSpacing = 0; // Sin espacio horizontal como pediste
            const verticalSpacing = 10;   // Mantener espacio vertical
            
            const rectWithSpacing = width + horizontalSpacing;
            const rectHeightWithSpacing = height + verticalSpacing;
            
            // Calcular cuántos rectángulos caben por fila
            const rectsPerRow = Math.floor((imgWidth - width) / rectWithSpacing) + 1;
            
            // Calcular posición en grid (empezando desde 0 para el template)
            const gridIndex = this.rectCounter - 1;
            const row = Math.floor(gridIndex / rectsPerRow);
            const col = gridIndex % rectsPerRow;
            
            // Posición dentro de la imagen
            const startX = this.templateRectangle.left;
            const startY = this.templateRectangle.top;
            
            left = startX + col * rectWithSpacing;
            top = startY + row * rectHeightWithSpacing;
            
            // ✅ VERIFICAR QUE NO SE SALGA DE LA IMAGEN
            const rightEdge = left + width;
            const bottomEdge = top + height;
            const imgRightEdge = imgLeft + imgWidth;
            const imgBottomEdge = imgTop + imgHeight;
            
            if (rightEdge > imgRightEdge || bottomEdge > imgBottomEdge) {
                console.warn(`⚠️ Rectángulo ${this.rectCounter} se sale de la imagen`, {
                    rect: { left, top, right: rightEdge, bottom: bottomEdge },
                    image: { left: imgLeft, top: imgTop, right: imgRightEdge, bottom: imgBottomEdge }
                });
                
                // Si se sale, usar posición segura
                left = Math.min(left, imgRightEdge - width);
                top = Math.min(top, imgBottomEdge - height);
            }
            
            console.log(`📐 Grid pos: fila ${row}, col ${col} → (${left}, ${top})`);
        }
        
        const rect = new fabric.Rect({
            left: left,
            top: top,
            width: width,
            height: height,
            fill: this.rectCounter === 1 ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 0, 0.3)', // Cyan para el primero, verde para los demás
            stroke: this.rectCounter === 1 ? '#00ffff' : '#00ff00', // Cyan para el primero, verde para los demás
            strokeWidth: 3,
            cornerSize: 12,
            // Propiedades básicas de interacción
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            hasRotatingPoint: false
        });

        // Añadir datos personalizados
        rect.set({
            id: `letter_${this.rectCounter}`,
            customName: letterName,
            unicode: this.getUnicodeForLetter(letterName.replace(document.getElementById('namePrefix').value, ''))
        });

        this.canvas.add(rect);
        this.canvas.setActiveObject(rect);
        this.canvas.renderAll();

        this.rectangles.push(rect);
        
        // Si es el primer rectángulo, solo marcarlo como template sin modificaciones
        if (!this.templateRectangle) {
            this.templateRectangle = rect;
            this.detectImageOrientation();
            this.updateTemplateInfo();
            console.log('✅ Template establecido - Primer rectángulo completamente funcional');
        }
        
        this.updateRectanglesList();
        this.handleSelection(rect);
        
        console.log(`✅ Rectángulo creado: ${letterName} - Posición: (${left}, ${top}) - Tamaño: ${width}x${height}`);
        this.showMessage(`Rectángulo "${letterName}" añadido - Completamente editable`, 'success');
    }

    deleteSelected() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject !== this.backgroundImage) {
            this.canvas.remove(activeObject);
            this.rectangles = this.rectangles.filter(rect => rect !== activeObject);
            
            // Si eliminamos el template, elegir un nuevo template si hay rectángulos
            if (activeObject === this.templateRectangle) {
                this.templateRectangle = this.rectangles.length > 0 ? this.rectangles[0] : null;
            }
            
            this.updateRectanglesList();
            this.handleSelectionCleared();
        }
    }

    // Nueva función: Reinicializar propiedades de rectángulo
    resetRectangleProperties(rect) {
        if (!rect) return;
        
        // Guardar posición actual
        const currentLeft = rect.left;
        const currentTop = rect.top;
        const currentWidth = rect.width * rect.scaleX;
        const currentHeight = rect.height * rect.scaleY;
        const currentName = rect.customName;
        const currentUnicode = rect.unicode;
        
        // Remover el rectángulo actual
        this.canvas.remove(rect);
        
        // Determinar si es el primer rectángulo para asignar color correcto
        const isFirstRect = this.rectangles.indexOf(rect) === 0 || rect === this.templateRectangle;
        
        // Crear un rectángulo completamente nuevo
        const newRect = new fabric.Rect({
            left: currentLeft,
            top: currentTop,
            width: currentWidth,
            height: currentHeight,
            fill: isFirstRect ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 0, 0.3)', // Cyan para el primero, verde para los demás
            stroke: isFirstRect ? '#00ffff' : '#00ff00', // Cyan para el primero, verde para los demás
            strokeWidth: 3,
            cornerSize: 12,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            hasRotatingPoint: false,
            lockRotation: true
        });
        
        // Restaurar datos personalizados
        newRect.set({
            id: rect.id,
            customName: currentName,
            unicode: currentUnicode
        });
        
        // Agregar al canvas
        this.canvas.add(newRect);
        
        // Actualizar referencias
        const index = this.rectangles.indexOf(rect);
        if (index !== -1) {
            this.rectangles[index] = newRect;
        }
        
        if (this.templateRectangle === rect) {
            this.templateRectangle = newRect;
            // Configurar como template SIN llamar setAsTemplate (preservar interactividad)
            newRect.isTemplate = true;
            newRect.stroke = '#00ffff'; // Cyan para template (primera letra)
            newRect.strokeWidth = 3;
            // Mantener todas las propiedades de interacción intactas
        }
        
        this.canvas.setActiveObject(newRect);
        this.canvas.renderAll();
        
        console.log('🔧 Rectángulo recreado completamente');
        this.showMessage('Rectángulo recreado - ahora debería funcionar correctamente', 'success');
        
        return newRect;
    }

    // Función de test temporal
    testBasicRect() {
        console.log('🧪 Creando rectángulo de test básico...');
        console.log('🧪 Estado del canvas:', {
            selection: this.canvas.selection,
            interactive: this.canvas.interactive,
            isDrawingMode: this.canvas.isDrawingMode,
            objects: this.canvas.getObjects().length
        });
        
        const testRect = new fabric.Rect({
            left: 50,
            top: 50,
            width: 100,
            height: 100,
            fill: 'green',
            stroke: 'darkgreen',
            strokeWidth: 2
        });
        
        console.log('🧪 Propiedades del rectángulo de test:', {
            selectable: testRect.selectable,
            evented: testRect.evented,
            hasControls: testRect.hasControls,
            hasBorders: testRect.hasBorders
        });
        
        this.canvas.add(testRect);
        
        // Forzar configuración después de añadir
        this.canvas.selection = true;
        this.canvas.interactive = true;
        
        this.canvas.setActiveObject(testRect);
        this.canvas.renderAll();
        
        console.log('🧪 Después de añadir - Estado canvas:', {
            selection: this.canvas.selection,
            interactive: this.canvas.interactive,
            activeObject: this.canvas.getActiveObject()
        });
        
        this.showMessage('Rectángulo de test creado (verde) - Intenta moverlo', 'info');
    }

    // Función para resetear completamente el canvas
    resetCanvas() {
        console.log('🔄 Reseteando canvas completamente...');
        
        // Guardar objetos actuales
        const objects = this.canvas.getObjects().filter(obj => obj !== this.backgroundImage);
        
        // Forzar configuración del canvas
        this.canvas.selection = true;
        this.canvas.interactive = true;
        this.canvas.isDrawingMode = false;
        this.canvas.defaultCursor = 'default';
        this.canvas.hoverCursor = 'move';
        this.canvas.moveCursor = 'move';
        
        // Reconfigurar todos los objetos
        objects.forEach(obj => {
            obj.set({
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
                hasRotatingPoint: false
            });
        });
        
        this.canvas.renderAll();
        
        console.log('🔄 Canvas reseteado');
        this.showMessage('Canvas reseteado - Los rectángulos deberían funcionar ahora', 'success');
    }

    // Nueva función: Establecer rectángulo como template
    setAsTemplate(rect) {
        this.templateRectangle = rect;
        this.detectImageOrientation();
        
        // Agregar indicador visual al template MANTENIENDO las propiedades de interacción
        if (this.templateRectangle) {
            this.templateRectangle.set({
                stroke: '#00ffff', // Cyan para indicar que es template (primera letra)
                strokeWidth: 3,
                // IMPORTANTE: Mantener propiedades de interacción
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
                hasRotatingPoint: false
            });
            this.canvas.renderAll();
        }
        
        // Actualizar información del template en la UI
        this.updateTemplateInfo();
        
        const width = Math.round(rect.width * rect.scaleX);
        const height = Math.round(rect.height * rect.scaleY);
        console.log('✅ Template establecido - Propiedades mantenidas');
        this.showMessage(`Template establecido: ${width} × ${height} px`, 'success');
    }

    // Nueva función: Detectar orientación de la imagen
    detectImageOrientation() {
        if (this.backgroundImage) {
            const imgWidth = this.backgroundImage.width * this.backgroundImage.scaleX;
            const imgHeight = this.backgroundImage.height * this.backgroundImage.scaleY;
            this.imageOrientation = imgWidth > imgHeight ? 'horizontal' : 'vertical';
            console.log(`📐 Orientación detectada: ${this.imageOrientation} (${imgWidth}x${imgHeight})`);
        }
    }

    // Nueva función: Generar grid automático de A-Z
    generateLetterGrid() {
        if (!this.templateRectangle) {
            alert('⚠️ Primero crea y ajusta el rectángulo de la letra A como template');
            return;
        }

        const alphabet = this.getCurrentAlphabet();
        const existingLetters = this.rectangles.length;
        const lettersToGenerate = Math.min(26, alphabet.length) - existingLetters;
        
        if (lettersToGenerate <= 0) {
            alert('✅ Ya tienes suficientes rectángulos para el alfabeto seleccionado');
            return;
        }

        console.log(`🔤 Generando ${lettersToGenerate} rectángulos en un solo paso...`);
        
        // Información del template
        const template = this.templateRectangle;
        const width = template.width * template.scaleX;
        const height = template.height * template.scaleY;
        
        // Información de la imagen
        const imgWidth = this.backgroundImage.width * this.backgroundImage.scaleX;
        const imgHeight = this.backgroundImage.height * this.backgroundImage.scaleY;
        
        // Configuración de espaciado
        const horizontalSpacing = 0;
        const verticalSpacing = 10;
        const rectWithSpacing = width + horizontalSpacing;
        const rectHeightWithSpacing = height + verticalSpacing;
        const rectsPerRow = Math.floor((imgWidth - width) / rectWithSpacing) + 1;
        
        // Crear todos los rectángulos de una vez
        for (let i = 0; i < lettersToGenerate; i++) {
            this.rectCounter++;
            const letterName = this.getNextLetterName();
            
            // Calcular posición en grid
            const gridIndex = this.rectCounter - 1;
            const row = Math.floor(gridIndex / rectsPerRow);
            const col = gridIndex % rectsPerRow;
            
            const left = template.left + col * rectWithSpacing;
            const top = template.top + row * rectHeightWithSpacing;
            
            // Crear rectángulo directamente sin llamar addRectangle
            const rect = new fabric.Rect({
                left: left,
                top: top,
                width: width,
                height: height,
                fill: 'rgba(0, 255, 0, 0.3)', // Verde para rectángulos del grid
                stroke: '#00ff00', // Verde
                strokeWidth: 3,
                cornerSize: 12,
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
                hasRotatingPoint: false
            });

            // Configurar datos del rectángulo
            rect.set({
                id: `letter_${this.rectCounter}`,
                customName: letterName,
                unicode: this.getUnicodeForLetter(letterName.replace(document.getElementById('namePrefix').value, ''))
            });

            this.canvas.add(rect);
            this.rectangles.push(rect);
        }
        
        this.canvas.renderAll();
        this.updateRectanglesList();
        
        alert(`✅ Grid generado: ${this.rectangles.length} rectángulos total (${lettersToGenerate} nuevos)`);
        console.log(`✅ Grid completo: ${this.rectangles.length} rectángulos creados`);
    }

    // Nueva función: Obtener alfabeto actual
    getCurrentAlphabet() {
        const alphabetType = document.getElementById('alphabetType').value;
        return this.alphabets[alphabetType] || this.alphabets.uppercase;
    }

    handleSelection(obj) {
        if (obj && obj !== this.backgroundImage) {
            this.selectedRect = obj;
            this.updateSelectedInfo();
            this.updateRectanglesList();
            document.getElementById('deleteSelectedBtn').disabled = false;
            document.getElementById('resetRectBtn').disabled = false;
        }
    }

    handleSelectionCleared() {
        this.selectedRect = null;
        document.getElementById('selectedInfo').style.display = 'none';
        document.getElementById('deleteSelectedBtn').disabled = true;
        document.getElementById('resetRectBtn').disabled = true;
        this.updateRectanglesList();
    }

    updateSelectedInfo() {
        if (!this.selectedRect) return;

        const info = document.getElementById('selectedInfo');
        info.style.display = 'block';

        document.getElementById('selectedName').value = this.selectedRect.customName || '';
        document.getElementById('selectedUnicode').value = this.selectedRect.unicode || '';
        
        this.updateCoordinatesDisplay();
    }

    updateSelectedUnicode(unicode) {
        if (this.selectedRect) {
            this.selectedRect.unicode = unicode;
        }
    }

    updateCoordinatesDisplay() {
        if (!this.selectedRect) return;

        const rect = this.selectedRect;
        const left = Math.round(rect.left);
        const top = Math.round(rect.top);
        const width = Math.round(rect.width * rect.scaleX);
        const height = Math.round(rect.height * rect.scaleY);

        document.getElementById('selectedX').textContent = left;
        document.getElementById('selectedY').textContent = top;
        document.getElementById('selectedWidth').textContent = width;
        document.getElementById('selectedHeight').textContent = height;
    }

    updateSelectedName(name) {
        if (this.selectedRect) {
            this.selectedRect.customName = name;
            this.updateRectanglesList();
        }
    }

    updateRectangleData(rect) {
        if (rect === this.selectedRect) {
            this.updateCoordinatesDisplay();
        }
        
        // Si se modifica el template, actualizar las dimensiones del template
        if (rect === this.templateRectangle) {
            this.updateTemplate(rect);
        }
        
        this.updateRectanglesList();
    }

    updateTemplate(rect) {
        const width = Math.round(rect.width * rect.scaleX);
        const height = Math.round(rect.height * rect.scaleY);
        
        // Mostrar información del template actualizada
        this.showMessage(`Template actualizado: ${width} × ${height} px`, 'info');
        
        // Actualizar la información del template en la interfaz
        this.updateTemplateInfo();
    }

    updateTemplateInfo() {
        let templateInfo = document.getElementById('templateInfo');
        
        if (!this.templateRectangle) {
            // Si no hay template, remover la información si existe
            if (templateInfo) {
                templateInfo.remove();
            }
            return;
        }
        
        const width = Math.round(this.templateRectangle.width * this.templateRectangle.scaleX);
        const height = Math.round(this.templateRectangle.height * this.templateRectangle.scaleY);
        
        // Buscar o crear el elemento de información del template
        if (!templateInfo) {
            templateInfo = document.createElement('div');
            templateInfo.id = 'templateInfo';
            templateInfo.className = 'template-info';
            
            const sidebar = document.querySelector('.controls-sidebar');
            const generateBtn = document.getElementById('generateGridBtn');
            if (generateBtn && sidebar) {
                sidebar.insertBefore(templateInfo, generateBtn);
            } else if (sidebar) {
                // Si no hay botón de grid, agregar al final de la sidebar
                sidebar.appendChild(templateInfo);
            }
        }
        
        templateInfo.innerHTML = `
            <div class="template-status">
                <span class="template-icon">📏</span>
                <div class="template-details">
                    <div class="template-title">Template Activo</div>
                    <div class="template-size">${width} × ${height} px</div>
                </div>
            </div>
        `;
    }

    updateRectanglesList() {
        const container = document.getElementById('rectanglesList');
        container.innerHTML = '';

        this.rectangles.forEach((rect, index) => {
            const item = document.createElement('div');
            item.className = 'rectangle-item';
            if (rect === this.selectedRect) {
                item.classList.add('selected');
            }

            const left = Math.round(rect.left);
            const top = Math.round(rect.top);
            const width = Math.round(rect.width * rect.scaleX);
            const height = Math.round(rect.height * rect.scaleY);

            item.innerHTML = `
                <div class="rectangle-info">
                    <div class="rectangle-name">${rect.customName || `Letra ${index + 1}`}</div>
                    <div class="rectangle-coords">X: ${left}, Y: ${top}, ${width} × ${height}</div>
                </div>
            `;

            // Click para seleccionar
            item.addEventListener('click', () => {
                this.canvas.setActiveObject(rect);
                this.canvas.renderAll();
            });

            container.appendChild(item);
        });

        // Actualizar estado de botones
        const hasRects = this.rectangles.length > 0;
        document.getElementById('saveJsonBtn').disabled = !hasRects;
        document.getElementById('processImageBtn').disabled = !hasRects;
        document.getElementById('clearAllBtn').disabled = !hasRects;
    }

    saveAsJSON() {
        if (this.rectangles.length === 0) return;

        const data = {
            timestamp: new Date().toISOString(),
            projectType: 'ancient_alphabet_extraction',
            alphabetType: document.getElementById('alphabetType').value,
            namePrefix: document.getElementById('namePrefix').value,
            imageInfo: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            letters: this.rectangles.map((rect, index) => ({
                id: rect.id || `letter_${index + 1}`,
                name: rect.customName || `Letra ${index + 1}`,
                unicode: rect.unicode || '',
                coordinates: {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top),
                    width: Math.round(rect.width * rect.scaleX),
                    height: Math.round(rect.height * rect.scaleY)
                }
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `alphabet_letters_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async processImage() {
        if (this.rectangles.length === 0 || !this.backgroundImage) {
            alert('Necesitas cargar una imagen y crear al menos un recuadro');
            return;
        }

        // Obtener la imagen original
        const imageInput = document.getElementById('imageInput');
        if (!imageInput.files[0]) {
            alert('No se encontró la imagen original');
            return;
        }

        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        
        // Añadir datos de las regiones
        const regionsData = {
            imageInfo: {
                width: this.canvas.width,
                height: this.canvas.height,
                originalWidth: this.backgroundImage.width / this.backgroundImage.scaleX,
                originalHeight: this.backgroundImage.height / this.backgroundImage.scaleY
            },
            regions: this.rectangles.map((rect, index) => ({
                id: rect.id || `rect_${index + 1}`,
                name: rect.customName || `Región ${index + 1}`,
                coordinates: {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top),
                    width: Math.round(rect.width * rect.scaleX),
                    height: Math.round(rect.height * rect.scaleY)
                }
            }))
        };
        
        formData.append('regions', JSON.stringify(regionsData));

        try {
            // Deshabilitar botón mientras procesa
            const processBtn = document.getElementById('processImageBtn');
            const originalText = processBtn.textContent;
            processBtn.textContent = '⏳ Procesando...';
            processBtn.disabled = true;

            const response = await fetch('http://localhost:5004/process', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `extracted_regions_${new Date().getTime()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                alert('¡Procesamiento completado! Se ha descargado el archivo ZIP con las regiones extraídas.');
            } else {
                throw new Error('Error en el servidor');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la imagen. Asegúrate de que el servidor backend esté ejecutándose.');
        } finally {
            // Restaurar botón
            const processBtn = document.getElementById('processImageBtn');
            processBtn.textContent = originalText;
            processBtn.disabled = false;
        }
    }

    clearAll() {
        this.canvas.clear();
        this.rectangles = [];
        this.selectedRect = null;
        this.backgroundImage = null;
        this.rectCounter = 0;
        this.currentAlphabetIndex = 0;
        this.templateRectangle = null;
        this.imageOrientation = null;
        this.isGridMode = false;
        
        this.canvas.setDimensions({
            width: 800,
            height: 600
        });
        
        this.updateRectanglesList();
        this.handleSelectionCleared();
        this.disableControls();
        
        // Limpiar info de secuencia
        const sequenceInfo = document.getElementById('sequenceInfo');
        if (sequenceInfo) {
            sequenceInfo.remove();
        }
        
        // Limpiar información del template
        this.updateTemplateInfo();
    }

    enableControls() {
        document.getElementById('addRectBtn').disabled = false;
        document.getElementById('generateGridBtn').disabled = false;
    }

    disableControls() {
        document.getElementById('addRectBtn').disabled = true;
        document.getElementById('generateGridBtn').disabled = true;
        document.getElementById('deleteSelectedBtn').disabled = true;
        document.getElementById('resetRectBtn').disabled = true;
        document.getElementById('saveJsonBtn').disabled = true;
        document.getElementById('processImageBtn').disabled = true;
        document.getElementById('clearAllBtn').disabled = true;
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new LetterExtractor();
});

// Prevenir zoom en dispositivos móviles con gestos táctiles
document.addEventListener('touchstart', function(event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);