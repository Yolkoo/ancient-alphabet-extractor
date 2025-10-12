# 🏺 Ancient Alphabet Extractor

Una herramienta web para extraer letras individuales de imágenes de alfabetos antiguos, diseñada especialmente para paleografía y estudios de escrituras históricas.

## ✨ Características

- **Interfaz táctil**: Compatible con iPad y dispositivos móviles
- **Carga de imágenes**: Soporte para formatos JPG, PNG, etc.
- **Selección visual**: Dibuja, mueve y redimensiona recuadros sobre la imagen
- **Gestión de regiones**: Nombra y administra múltiples regiones
- **Exportación JSON**: Descarga coordenadas en formato JSON
- **Procesamiento backend**: Extrae regiones automáticamente usando Python
- **Descarga ZIP**: Obtén todas las regiones extraídas en un archivo comprimido

## 📁 Estructura del Proyecto

```
Letter_Extractor_Pad/
├── frontend/
│   ├── index.html      # Interfaz principal
│   ├── styles.css      # Estilos responsivos
│   └── app.js          # Lógica con Fabric.js
└── backend/
    ├── app.py          # Servidor Flask
    └── requirements.txt # Dependencias Python
```

## 🔧 Instalación y Uso

### Frontend
1. Abre `frontend/index.html` en tu navegador web
2. También puedes servir los archivos con un servidor local:
   ```bash
   cd frontend
   python -m http.server 8000
   # Visita http://localhost:8000
   ```

### Backend
1. Instala las dependencias de Python:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Ejecuta el servidor Flask:
   ```bash
   python app.py
   ```
   El servidor estará disponible en `http://localhost:5000`

## 📱 Cómo Usar la Aplicación

1. **Cargar imagen**: Haz clic en "📁 Cargar Imagen" y selecciona tu archivo
2. **Crear recuadros**: Usa "➕ Añadir Recuadro" para crear nuevas regiones
3. **Editar regiones**: 
   - Arrastra para mover
   - Usa las esquinas para redimensionar
   - Cambia el nombre en el panel lateral
4. **Gestionar selecciones**:
   - Haz clic en un recuadro para seleccionarlo
   - Usa "🗑️ Borrar Seleccionado" para eliminar
5. **Exportar datos**:
   - "💾 Descargar JSON": Obtén las coordenadas
   - "🔄 Procesar Imagen": Extrae regiones (requiere backend)

## 🛠️ API del Backend

### `POST /process`
Procesa una imagen y extrae las regiones seleccionadas.

**Parámetros:**
- `image`: Archivo de imagen (multipart/form-data)
- `regions`: JSON con datos de regiones y coordenadas

**Respuesta:**
- Archivo ZIP con las imágenes extraídas y metadata JSON

### `GET /health`
Verifica el estado del servidor.

## 🎨 Características Técnicas

### Frontend
- **Fabric.js**: Manipulación de canvas interactivo
- **Responsive Design**: CSS optimizado para móviles y tabletas
- **Touch Support**: Gestos táctiles para iPad y teléfonos
- **Cross-browser**: Compatible con navegadores modernos

### Backend
- **Flask**: Framework web ligero
- **PIL/Pillow**: Procesamiento de imágenes
- **CORS**: Soporte para requests cross-origin
- **ZIP**: Compresión automática de resultados

## 🔍 Casos de Uso

- **Digitalización de documentos**: Extraer secciones específicas
- **Análisis de formularios**: Separar campos individuales
- **Procesamiento de cartas**: Extraer direcciones, fechas, etc.
- **OCR preparation**: Preparar regiones para reconocimiento de texto
- **Data labeling**: Anotar datasets para machine learning

## ⚡ Próximas Mejoras

- [ ] Soporte para múltiples formatos de exportación
- [ ] Integración con OCR automático
- [ ] Historial de proyectos
- [ ] Modo colaborativo
- [ ] Plantillas predefinidas
- [ ] Batch processing para múltiples imágenes

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙋‍♂️ Soporte

Si tienes preguntas o problemas:
- Abre un issue en GitHub
- Revisa la documentación de la API
- Verifica que el backend esté ejecutándose en el puerto correcto