from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image, ImageOps
import json
import io
import zipfile
import os
from datetime import datetime
import tempfile
import numpy as np

import numpy as np

def optimize_letter_for_procreate_and_ttf(image):
    """
    Optimiza una imagen de letra para su uso en pinceles de Procreate y fuentes TTF
    """
    # Convertir a escala de grises si no lo está
    if image.mode != 'L':
        image = image.convert('L')
    
    # Convertir a numpy array para procesamiento
    img_array = np.array(image)
    
    # Invertir si el fondo es más claro que el contenido
    if np.mean(img_array) > 127:
        img_array = 255 - img_array
    
    # Encontrar el bounding box del contenido real
    # Buscar píxeles no blancos
    coords = np.where(img_array < 240)  # threshold para eliminar ruido de fondo
    
    if len(coords[0]) > 0:
        # Calcular bounding box
        top, left = np.min(coords[0]), np.min(coords[1])
        bottom, right = np.max(coords[0]), np.max(coords[1])
        
        # Añadir padding del 10%
        height, width = bottom - top, right - left
        padding_h = int(height * 0.1)
        padding_w = int(width * 0.1)
        
        # Asegurar que no se salga de los límites
        top = max(0, top - padding_h)
        left = max(0, left - padding_w)
        bottom = min(img_array.shape[0], bottom + padding_h)
        right = min(img_array.shape[1], right + padding_w)
        
        # Recortar al bounding box
        img_array = img_array[top:bottom, left:right]
    
    # Convertir de vuelta a PIL Image
    optimized_image = Image.fromarray(img_array, mode='L')
    
    # Redimensionar manteniendo aspect ratio si es muy grande
    max_size = 512  # Tamaño máximo para pinceles de Procreate
    if max(optimized_image.size) > max_size:
        optimized_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Convertir a RGBA para mejor compatibilidad
    rgba_image = Image.new('RGBA', optimized_image.size, (255, 255, 255, 0))
    
    # Usar la intensidad como alpha channel (negro = opaco, blanco = transparente)
    alpha_data = []
    for pixel in optimized_image.getdata():
        alpha_data.append((0, 0, 0, 255 - pixel))  # Invertir para alpha
    
    rgba_image.putdata(alpha_data)
    
    return rgba_image

app = Flask(__name__)
CORS(app)  # Permitir requests desde el frontend

@app.route('/')
def index():
    return jsonify({
        "message": "Ancient Alphabet Extractor API",
        "version": "2.0.0 - Alphabet Specialist",
        "description": "Especializado en extracción de letras para pinceles de Procreate y fuentes TTF",
        "endpoints": {
            "/process": "POST - Procesar alfabeto y extraer letras optimizadas",
            "/health": "GET - Verificar estado del servidor"
        }
    })

@app.route('/health')
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})

@app.route('/process', methods=['POST'])
def process_image():
    try:
        # Verificar que se envió una imagen
        if 'image' not in request.files:
            return jsonify({"error": "No se envió ninguna imagen"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "No se seleccionó ninguna imagen"}), 400

        # Verificar que se enviaron los datos de las letras
        if 'regions' not in request.form:
            return jsonify({"error": "No se enviaron datos de letras"}), 400

        # Cargar la imagen
        try:
            image = Image.open(image_file.stream)
            # Convertir a RGB si es necesario (para JPEGs)
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
        except Exception as e:
            return jsonify({"error": f"Error al cargar la imagen: {str(e)}"}), 400

        # Parsear datos de letras
        try:
            regions_data = json.loads(request.form['regions'])
        except json.JSONDecodeError:
            return jsonify({"error": "Datos de letras inválidos"}), 400

        # Extraer información
        image_info = regions_data.get('imageInfo', {})
        letters = regions_data.get('letters', regions_data.get('regions', []))  # Compatibilidad
        project_type = regions_data.get('projectType', 'letter_extraction')
        alphabet_type = regions_data.get('alphabetType', 'custom')
        name_prefix = regions_data.get('namePrefix', '')

        if not letters:
            return jsonify({"error": "No se especificaron letras para extraer"}), 400

        # Calcular factor de escala entre la imagen original y la mostrada en el canvas
        original_width = image.width
        original_height = image.height
        canvas_width = image_info.get('width', original_width)
        canvas_height = image_info.get('height', original_height)
        
        scale_x = original_width / canvas_width
        scale_y = original_height / canvas_height

        # Crear un archivo ZIP en memoria
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Añadir el JSON con información de las letras
            letters_info = {
                "timestamp": datetime.now().isoformat(),
                "project_type": project_type,
                "alphabet_type": alphabet_type,
                "name_prefix": name_prefix,
                "original_image": {
                    "width": original_width,
                    "height": original_height,
                    "filename": image_file.filename
                },
                "canvas_info": image_info,
                "scale_factors": {
                    "x": scale_x,
                    "y": scale_y
                },
                "extracted_letters": []
            }

            # Extraer cada letra
            for i, letter in enumerate(letters):
                try:
                    # Obtener coordenadas de la letra
                    coords = letter.get('coordinates', {})
                    x = int(coords.get('x', 0) * scale_x)
                    y = int(coords.get('y', 0) * scale_y)
                    width = int(coords.get('width', 100) * scale_x)
                    height = int(coords.get('height', 100) * scale_y)

                    # Asegurar que las coordenadas estén dentro de la imagen
                    x = max(0, min(x, original_width - 1))
                    y = max(0, min(y, original_height - 1))
                    width = min(width, original_width - x)
                    height = min(height, original_height - y)

                    if width <= 0 or height <= 0:
                        print(f"Letra {i+1} tiene dimensiones inválidas, saltando...")
                        continue

                    # Extraer la letra
                    letter_image = image.crop((x, y, x + width, y + height))
                    
                    # Optimizar para pinceles de Procreate y fuentes TTF
                    optimized_letter = optimize_letter_for_procreate_and_ttf(letter_image)

                    # Preparar nombre de archivo
                    letter_name = letter.get('name', f'letter_{i+1}')
                    letter_unicode = letter.get('unicode', '')
                    
                    # Limpiar el nombre para que sea válido como nombre de archivo
                    safe_name = "".join(c for c in letter_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                    if not safe_name:
                        safe_name = f'letter_{i+1}'
                    
                    # Crear diferentes versiones del archivo
                    base_filename = safe_name
                    
                    # Versión optimizada PNG (para pinceles de Procreate)
                    png_filename = f"{base_filename}_procreate.png"
                    png_buffer = io.BytesIO()
                    optimized_letter.save(png_buffer, format='PNG')
                    png_buffer.seek(0)
                    zip_file.writestr(f"procreate_brushes/{png_filename}", png_buffer.getvalue())
                    
                    # Versión original PNG (para fuentes TTF)
                    original_filename = f"{base_filename}_original.png"
                    original_buffer = io.BytesIO()
                    letter_image.save(original_buffer, format='PNG')
                    original_buffer.seek(0)
                    zip_file.writestr(f"ttf_sources/{original_filename}", original_buffer.getvalue())

                    # Añadir información de la letra al JSON
                    letters_info["extracted_letters"].append({
                        "id": letter.get('id', f'letter_{i+1}'),
                        "name": letter_name,
                        "unicode": letter_unicode,
                        "procreate_filename": f"procreate_brushes/{png_filename}",
                        "ttf_filename": f"ttf_sources/{original_filename}",
                        "original_coordinates": coords,
                        "scaled_coordinates": {
                            "x": x,
                            "y": y,
                            "width": width,
                            "height": height
                        }
                    })

                except Exception as e:
                    print(f"Error procesando letra {i+1}: {str(e)}")
                    continue

            # Añadir el archivo JSON con información al ZIP
            json_data = json.dumps(letters_info, indent=2, ensure_ascii=False)
            zip_file.writestr('alphabet_info.json', json_data.encode('utf-8'))

        # Preparar el archivo para envío
        zip_buffer.seek(0)
        
        # Crear nombre de archivo único
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"extracted_regions_{timestamp}.zip"

        return send_file(
            io.BytesIO(zip_buffer.getvalue()),
            mimetype='application/zip',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        print(f"Error general: {str(e)}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

if __name__ == '__main__':
    print("🚀 Iniciando Letter Extractor API...")
    print("📡 Servidor disponible en: http://localhost:5001")
    print("🔄 Endpoints disponibles:")
    print("   GET  /health - Verificar estado")
    print("   POST /process - Procesar imagen")
    print("\n💡 Para usar con el frontend, asegúrate de que esté ejecutándose en el mismo puerto o configura CORS adecuadamente")
    
    app.run(debug=True, host='0.0.0.0', port=5001)