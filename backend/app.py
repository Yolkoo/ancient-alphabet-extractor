from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import json
import io
import zipfile
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Permitir requests desde el frontend

@app.route('/')
def index():
    return jsonify({
        "message": "Ancient Alphabet Extractor API",
        "version": "2.0.0 - Extraction Focused",
        "description": "Extracción rápida y precisa de letras de alfabetos antiguos",
        "endpoints": {
            "/process": "POST - Extraer letras sin post-procesamiento",
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

                    # Extraer la región exacta sin modificaciones
                    letter_image = image.crop((x, y, x + width, y + height))

                    # Preparar nombre de archivo
                    letter_name = letter.get('name', f'letter_{i+1}')
                    # Limpiar el nombre para que sea válido como nombre de archivo
                    safe_name = "".join(c for c in letter_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                    if not safe_name:
                        safe_name = f'letter_{i+1}'
                    
                    filename = f"{safe_name}.png"
                    
                    # Guardar la imagen sin modificaciones
                    img_buffer = io.BytesIO()
                    letter_image.save(img_buffer, format='PNG')
                    img_buffer.seek(0)
                    
                    # Añadir al ZIP
                    zip_file.writestr(filename, img_buffer.getvalue())

                    # Añadir información de la letra al JSON
                    letters_info["extracted_letters"].append({
                        "id": letter.get('id', f'letter_{i+1}'),
                        "name": letter_name,
                        "unicode": letter.get('unicode', ''),
                        "filename": filename,
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
            zip_file.writestr('letters_info.json', json_data.encode('utf-8'))

        # Preparar el archivo para envío
        zip_buffer.seek(0)
        
        # Crear nombre de archivo único
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"extracted_letters_{timestamp}.zip"

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
    print("🚀 Iniciando Ancient Alphabet Extractor API...")
    print("📡 Servidor disponible en: http://localhost:5001")
    print("🔄 Endpoints disponibles:")
    print("   GET  /health - Verificar estado")
    print("   POST /process - Extraer letras")
    print("\n💡 Enfocado en extracción rápida y precisa sin post-procesamiento")
    
    app.run(debug=True, host='0.0.0.0', port=5004)