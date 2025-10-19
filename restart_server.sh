#!/bin/bash

# Activar el entorno virtual
if [ -d ".venv" ]; then
    source ./.venv/bin/activate
else
    echo "El entorno virtual (.venv) no existe. Por favor, créalo o verifica la ruta."
    exit 1
fi

# Detener cualquier instancia existente del servidor Flask
pkill -f "python3 /Users/mi/Letter_Extractor_Pad/backend/app.py"

# Iniciar el servidor Flask
python3 /Users/mi/Letter_Extractor_Pad/backend/app.py