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

        // Debug buttons (temporal)
        document.getElementById('debugRectsBtn').addEventListener('click', () => {
            this.debugAllRectangles();
        });

        document.getElementById('fixTemplateBtn').addEventListener('click', () => {
            this.fixTemplateInteractivity();
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
            
            // Actualizar template info solo cuando termine la interacción
            if (this.templateRectangle) {
                this.updateTemplateInfo();
            }
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
        // Posicionar de manera inteligente
        let left = 100 + (this.rectCounter - 1) * 20; // Offset para evitar solapamiento
        let top = 100 + (this.rectCounter - 1) * 20;
        
        if (this.templateRectangle) {
            width = this.templateRectangle.width * this.templateRectangle.scaleX;
            height = this.templateRectangle.height * this.templateRectangle.scaleY;
            
            // Calcular posición en grid inteligente
            const spacing = 10;
            const startX = this.templateRectangle.left;
            const startY = this.templateRectangle.top;
            
            // Obtener dimensiones de la imagen para calcular límites
            const imageWidth = this.backgroundImage.width * this.backgroundImage.scaleX;
            const imageHeight = this.backgroundImage.height * this.backgroundImage.scaleY;
            
            console.log(`🔍 DEBUG Grid calculation for rect ${this.rectCounter}:`);
            console.log(`   Template position: (${startX}, ${startY})`);
            console.log(`   Template size: ${width} x ${height}`);
            console.log(`   Image size: ${imageWidth} x ${imageHeight}`);
            
            // Calcular cuántos rectángulos caben por fila
            const rectWithSpacing = width + spacing;
            const availableWidth = imageWidth - startX - width; // Espacio disponible desde el template
            const maxRectsPerRow = Math.max(1, Math.floor(availableWidth / rectWithSpacing) + 1); // +1 incluye el template, mínimo 1
            
            console.log(`   Available width: ${availableWidth}`);
            console.log(`   Rect with spacing: ${rectWithSpacing}`);
            console.log(`   Max rects per row: ${maxRectsPerRow}`);
            
            // Calcular posición en grid (índice empieza en 0 para el template, 1 para el segundo rectángulo)
            const gridIndex = this.rectCounter - 1; // Índice del rectángulo actual (template es 0)
            const row = Math.floor(gridIndex / maxRectsPerRow);
            const col = gridIndex % maxRectsPerRow;
            
            // Posicionar en el grid
            left = startX + col * rectWithSpacing;
            top = startY + row * (height + spacing);
            
            console.log(`📐 Grid positioning: rect ${this.rectCounter}, gridIndex=${gridIndex}, grid(${row},${col}), pos(${Math.round(left)},${Math.round(top)})`);
            
            // Verificar si está fuera de los límites
            if (left + width > imageWidth) {
                console.warn(`⚠️  Rectangle would be outside image bounds! left+width=${left + width} > imageWidth=${imageWidth}`);
            }
            if (top + height > imageHeight) {
                console.warn(`⚠️  Rectangle would be outside image bounds! top+height=${top + height} > imageHeight=${imageHeight}`);
            }
        }
        
        const rect = new fabric.Rect({
            left: left,
            top: top,
            width: width,
            height: height,
            fill: 'rgba(255, 0, 0, 0.3)', // Rojo para debug - más visible
            stroke: '#ff0000',
            strokeWidth: 3,
            cornerSize: 12,
            // PROPIEDADES CRÍTICAS DE INTERACCIÓN - FORZAR VALORES
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            hasRotatingPoint: true,
            lockRotation: false,
            moveable: true,
            // Propiedades adicionales para asegurar interacción
            hoverCursor: 'move',
            moveCursor: 'move',
            transparentCorners: false,
            cornerColor: '#fff',
            cornerStyle: 'rect'
        });

        // Añadir datos personalizados
        rect.set({
            id: `letter_${this.rectCounter}`,
            customName: letterName,
            unicode: this.getUnicodeForLetter(letterName.replace(document.getElementById('namePrefix').value, ''))
        });

        this.canvas.add(rect);
        this.rectangles.push(rect);
        
        // Si es el primer rectángulo, configurarlo como template DESPUÉS de agregarlo al canvas
        if (!this.templateRectangle) {
            console.log('🎯 Configurando primer rectángulo como template...');
            
            // Establecer template INMEDIATAMENTE, no en setTimeout
            this.templateRectangle = rect;
            this.detectImageOrientation();
            
            // SOLO cambiar apariencia visual, NO tocar propiedades de interacción
            rect.set({
                stroke: '#28a745',
                strokeWidth: 3,
                fill: 'rgba(40, 167, 69, 0.2)'
            });
            
            // Marcar como template con una propiedad personalizada
            rect.isTemplate = true;
            
            // FORZAR re-renderizado
            this.canvas.renderAll();
            
            // Debug: verificar que las propiedades se mantuvieron
            console.log('✅ Template configurado - Propiedades finales:', {
                selectable: rect.selectable,
                evented: rect.evented,
                hasControls: rect.hasControls,
                hasBorders: rect.hasBorders,
                moveable: rect.moveable,
                isTemplate: rect.isTemplate
            });
            
            this.updateTemplateInfo();
            this.showMessage(`Template establecido: ${rect.customName}`, 'success');
        }
        
        // Forzar selección del nuevo rectángulo
        setTimeout(() => {
            this.canvas.setActiveObject(rect);
            this.canvas.renderAll();
        }, 100);
        
        this.updateRectanglesList();
        this.handleSelection(rect);
        
        // Debug log detallado
        console.log(`✅ Rectángulo creado: ${letterName} en (${Math.round(left)}, ${Math.round(top)}) - ${Math.round(width)}x${Math.round(height)}`, {
            position: { left, top },
            size: { width, height },
            properties: {
                selectable: rect.selectable,
                evented: rect.evented,
                hasControls: rect.hasControls,
                moveable: rect.moveable
            }
        });
        
        this.showMessage(`Rectángulo "${letterName}" añadido`, 'success');
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
        
        // Crear un rectángulo completamente nuevo
        const newRect = new fabric.Rect({
            left: currentLeft,
            top: currentTop,
            width: currentWidth,
            height: currentHeight,
            fill: 'rgba(0, 123, 255, 0.3)',
            stroke: '#007bff',
            strokeWidth: 2,
            cornerColor: '#007bff',
            cornerSize: 12,
            transparentCorners: false,
            cornerStyle: 'rect',
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
            newRect.stroke = '#28a745';
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
                stroke: '#28a745', // Verde para indicar que es template
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

        console.log(`🔤 Generando ${lettersToGenerate} rectángulos adicionales...`);
        
        // Generar los rectángulos restantes
        for (let i = 0; i < lettersToGenerate; i++) {
            this.addRectangle();
        }
        
        alert(`✅ Grid generado: ${this.rectangles.length} rectángulos para ${alphabet.substring(0, this.rectangles.length)}`);
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
        
        // Mostrar información del template actualizada (sin DOM update durante movimiento)
        this.showMessage(`Template actualizado: ${width} × ${height} px`, 'info');
        
        // NO actualizar DOM durante el movimiento - solo al final
        // La información se actualiza cuando se termina la interacción
    }

    updateTemplateInfo() {
        // Función más segura que evita errores DOM
        try {
            let templateInfo = document.getElementById('templateInfo');
            
            if (!this.templateRectangle) {
                // Si no hay template, remover la información si existe
                if (templateInfo && templateInfo.parentNode) {
                    templateInfo.remove();
                }
                return;
            }
            
            const width = Math.round(this.templateRectangle.width * this.templateRectangle.scaleX);
            const height = Math.round(this.templateRectangle.height * this.templateRectangle.scaleY);
            
            // Si no existe, crear el elemento de información del template
            if (!templateInfo) {
                templateInfo = document.createElement('div');
                templateInfo.id = 'templateInfo';
                templateInfo.className = 'template-info';
                
                const sidebar = document.querySelector('.controls-sidebar');
                if (sidebar) {
                    // Simplemente agregar al final del sidebar para evitar errores
                    sidebar.appendChild(templateInfo);
                }
            }
            
            // Actualizar el contenido solo si el elemento existe y está en el DOM
            if (templateInfo && templateInfo.parentNode) {
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
        } catch (error) {
            console.warn('Error en updateTemplateInfo (ignorado):', error);
            // No hacer nada, seguir funcionando sin mostrar template info
        }
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

        // Declarar originalText fuera del try-catch para que esté disponible en finally
        const processBtn = document.getElementById('processImageBtn');
        const originalText = processBtn.textContent;

        try {
            // Deshabilitar botón mientras procesa
            processBtn.textContent = '⏳ Procesando...';
            processBtn.disabled = true;

            this.showMessage('📸 Extrayendo regiones con Canvas API...', 'info');

            // Usar canvas para procesar la imagen directamente en el navegador
            const extractedImages = await this.extractRegionsWithCanvas();
            
            // Crear archivo ZIP con JSZip
            const zip = new JSZip();
            
            // Añadir cada imagen extraída al ZIP
            extractedImages.forEach((imageData, index) => {
                const rect = this.rectangles[index];
                const fileName = `${rect.customName || `region_${index + 1}`}.png`;
                
                // Convertir data URL a blob y añadir al ZIP
                const base64Data = imageData.split(',')[1];
                zip.file(fileName, base64Data, {base64: true});
            });

            // Crear metadatos JSON
            const metadata = {
                timestamp: new Date().toISOString(),
                projectType: 'ancient_alphabet_extraction',
                alphabetType: document.getElementById('alphabetType').value,
                totalRegions: this.rectangles.length,
                imageInfo: {
                    originalWidth: this.backgroundImage.width / this.backgroundImage.scaleX,
                    originalHeight: this.backgroundImage.height / this.backgroundImage.scaleY,
                    canvasWidth: this.canvas.width,
                    canvasHeight: this.canvas.height
                },
                regions: this.rectangles.map((rect, index) => ({
                    id: rect.id || `region_${index + 1}`,
                    name: rect.customName || `Región ${index + 1}`,
                    unicode: rect.unicode || '',
                    coordinates: {
                        x: Math.round(rect.left),
                        y: Math.round(rect.top),
                        width: Math.round(rect.width * rect.scaleX),
                        height: Math.round(rect.height * rect.scaleY)
                    }
                }))
            };

            zip.file('metadata.json', JSON.stringify(metadata, null, 2));

            // Generar y descargar el ZIP
            const zipBlob = await zip.generateAsync({type: 'blob'});
            const url = URL.createObjectURL(zipBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `extracted_alphabet_${new Date().getTime()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage(`✅ ¡Éxito! Descargado ZIP con ${extractedImages.length} letras extraídas`, 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('❌ Error al procesar la imagen', 'error');
            alert('Error al procesar la imagen: ' + error.message);
        } finally {
            // Restaurar botón
            processBtn.textContent = originalText;
            processBtn.disabled = false;
        }
    }

    // Nueva función: Extraer regiones usando Canvas API
    async extractRegionsWithCanvas() {
        const imageFile = document.getElementById('imageInput').files[0];
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const extractedImages = [];
                
                // Calcular el factor de escala entre la imagen real y la mostrada en canvas
                const scaleX = img.width / (this.backgroundImage.width * this.backgroundImage.scaleX);
                const scaleY = img.height / (this.backgroundImage.height * this.backgroundImage.scaleY);
                
                console.log('🔍 Factor de escala:', { scaleX, scaleY });
                console.log('📐 Imagen original:', { width: img.width, height: img.height });
                console.log('📐 Imagen en canvas:', { 
                    width: this.backgroundImage.width * this.backgroundImage.scaleX, 
                    height: this.backgroundImage.height * this.backgroundImage.scaleY 
                });

                this.rectangles.forEach((rect, index) => {
                    // Crear canvas temporal para extraer cada región
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // Calcular coordenadas en la imagen original
                    const sourceX = Math.round(rect.left * scaleX);
                    const sourceY = Math.round(rect.top * scaleY);
                    const sourceWidth = Math.round((rect.width * rect.scaleX) * scaleX);
                    const sourceHeight = Math.round((rect.height * rect.scaleY) * scaleY);
                    
                    // Establecer tamaño del canvas temporal
                    tempCanvas.width = sourceWidth;
                    tempCanvas.height = sourceHeight;
                    
                    // Extraer la región de la imagen
                    tempCtx.drawImage(
                        img,
                        sourceX, sourceY, sourceWidth, sourceHeight,  // Fuente
                        0, 0, sourceWidth, sourceHeight                // Destino
                    );
                    
                    // Convertir a data URL
                    const dataURL = tempCanvas.toDataURL('image/png');
                    extractedImages.push(dataURL);
                    
                    console.log(`✂️ Región ${index + 1} extraída:`, {
                        name: rect.customName,
                        source: { x: sourceX, y: sourceY, w: sourceWidth, h: sourceHeight },
                        canvas: { x: rect.left, y: rect.top, w: rect.width * rect.scaleX, h: rect.height * rect.scaleY }
                    });
                });
                
                resolve(extractedImages);
            };
            
            // Cargar la imagen original
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(imageFile);
        });
    }

    // Nueva función: Mostrar mensajes al usuario
    showMessage(message, type = 'info') {
        // Crear o actualizar elemento de mensaje
        let messageEl = document.getElementById('status-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'status-message';
            messageEl.className = 'status-message';
            document.querySelector('.controls-sidebar').prepend(messageEl);
        }
        
        // Configurar estilo según tipo
        messageEl.className = `status-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos para mensajes informativos
        if (type === 'info' || type === 'success') {
            setTimeout(() => {
                if (messageEl) {
                    messageEl.style.display = 'none';
                }
            }, 5000);
        }
    }

    // Función de debug: Analizar todos los rectángulos
    debugAllRectangles() {
        console.log('🔍 DEBUG: Analizando todos los rectángulos...');
        console.log('📊 Canvas info:', {
            selection: this.canvas.selection,
            interactive: this.canvas.interactive,
            totalObjects: this.canvas.getObjects().length,
            rectangles: this.rectangles.length
        });

        this.rectangles.forEach((rect, index) => {
            const isTemplate = rect === this.templateRectangle;
            console.log(`📋 Rectángulo ${index + 1}${isTemplate ? ' (TEMPLATE)' : ''}:`, {
                name: rect.customName,
                selectable: rect.selectable,
                evented: rect.evented,
                hasControls: rect.hasControls,
                hasBorders: rect.hasBorders,
                moveable: rect.moveable,
                lockRotation: rect.lockRotation,
                isTemplate: rect.isTemplate,
                position: `(${rect.left}, ${rect.top})`,
                size: `${rect.width * rect.scaleX}x${rect.height * rect.scaleY}`,
                stroke: rect.stroke,
                fill: rect.fill
            });
        });

        // Mostrar información en pantalla
        const problemRects = this.rectangles.filter(rect => 
            !rect.selectable || !rect.evented || !rect.hasControls
        );

        if (problemRects.length > 0) {
            console.log('❌ Rectángulos con problemas encontrados:', problemRects.length);
            this.showMessage(`⚠️ ${problemRects.length} rectángulos tienen problemas de interactividad`, 'error');
            document.getElementById('fixTemplateBtn').disabled = false;
        } else {
            console.log('✅ Todos los rectángulos están correctamente configurados');
            this.showMessage('✅ Todos los rectángulos funcionan correctamente', 'success');
            document.getElementById('fixTemplateBtn').disabled = true;
        }

        // Test específico del template
        if (this.templateRectangle) {
            console.log('🎯 Test específico del template:', {
                canSelect: this.templateRectangle.selectable,
                canEvent: this.templateRectangle.evented,
                hasControls: this.templateRectangle.hasControls,
                position: this.templateRectangle.getBoundingRect()
            });

            // Intentar seleccionar el template
            try {
                this.canvas.setActiveObject(this.templateRectangle);
                this.canvas.renderAll();
                console.log('✅ Template seleccionado exitosamente');
            } catch (error) {
                console.log('❌ Error al seleccionar template:', error);
            }
        }
    }

    // Función de debug: Arreglar template
    fixTemplateInteractivity() {
        if (!this.templateRectangle) {
            this.showMessage('❌ No hay template para arreglar', 'error');
            return;
        }

        console.log('🔧 Intentando arreglar interactividad del template...');
        
        const template = this.templateRectangle;
        const originalData = {
            left: template.left,
            top: template.top,
            width: template.width * template.scaleX,
            height: template.height * template.scaleY,
            customName: template.customName,
            unicode: template.unicode,
            id: template.id
        };

        // Remover el template problemático
        this.canvas.remove(template);
        const templateIndex = this.rectangles.indexOf(template);

        // Crear un nuevo rectángulo completamente funcional
        const newTemplate = new fabric.Rect({
            left: originalData.left,
            top: originalData.top,
            width: originalData.width,
            height: originalData.height,
            fill: 'rgba(40, 167, 69, 0.2)',
            stroke: '#28a745',
            strokeWidth: 3,
            cornerSize: 12,
            // FORZAR todas las propiedades de interacción
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            hasRotatingPoint: true,
            lockRotation: false,
            moveable: true,
            hoverCursor: 'move',
            moveCursor: 'move'
        });

        // Restaurar datos
        newTemplate.set({
            id: originalData.id,
            customName: originalData.customName,
            unicode: originalData.unicode,
            isTemplate: true
        });

        // Agregar al canvas
        this.canvas.add(newTemplate);
        
        // Actualizar referencias
        this.templateRectangle = newTemplate;
        if (templateIndex !== -1) {
            this.rectangles[templateIndex] = newTemplate;
        }

        // Seleccionar inmediatamente
        this.canvas.setActiveObject(newTemplate);
        this.canvas.renderAll();

        console.log('✅ Template recreado con interactividad completa');
        this.showMessage('🔧 Template reparado - ¡Ahora debería funcionar!', 'success');
        
        // Actualizar UI
        this.updateRectanglesList();
        this.updateTemplateInfo();
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