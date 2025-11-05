import { useState } from 'react';

function FileUpload({ onDataProcessed }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(4);
  const [totalWeeks, setTotalWeeks] = useState(4);

  const handleFileChange = (event) => {
    if (event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setMessage(event.target.files[0].name);
    } else {
      setSelectedFile(null);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Por favor, selecciona un archivo primero.');
      return;
    }
    if (!currentWeek || !totalWeeks || currentWeek <= 0 || totalWeeks <= 0 || currentWeek > totalWeeks) {
       setMessage('Por favor, ingresa números válidos para las semanas.');
       return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('currentWeek', currentWeek);
    formData.append('totalWeeks', totalWeeks);

    try {
      setIsLoading(true);
      setMessage(`Procesando: ${selectedFile.name}...`);
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error desconocido.');
      onDataProcessed(data);
      setMessage(`¡Éxito! Datos de "${selectedFile.name}" cargados.`);
    } catch (error) {
      console.error('Error al subir o procesar el archivo:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Usamos variables CSS para los colores del texto
  const messageColorClass = message.startsWith('Error:') 
    ? 'text-red-400' 
    : message.startsWith('¡Éxito!') 
    ? 'text-green-400' 
    : 'text-[var(--color-texto-secundario)]'; // Variable

  return (
    // bg-gray-800 fijo está bien, ya que es parte del "control"
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <label 
          htmlFor="file-upload" 
          className="flex-shrink-0 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200"
        >
          Seleccionar Archivo
        </label>
        <input 
          id="file-upload" 
          type="file" 
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
          accept=".xlsx, .xls, .csv"
        />
        <span className={`text-sm truncate ${messageColorClass}`}>
          {message || "Aún no se ha seleccionado ningún archivo."}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          {/* Usamos variables CSS */}
          <label htmlFor="currentWeek" className="text-[var(--color-texto-secundario)]">Semana Actual:</label>
          <input
              id="currentWeek" type="number" value={currentWeek}
              onChange={(e) => setCurrentWeek(parseInt(e.target.value) || 1)}
              min="1" max={totalWeeks || 1} disabled={isLoading}
              className="bg-gray-700 rounded p-1 w-16 text-center text-[var(--color-texto-principal)] disabled:opacity-50"
          />
          <span className="text-gray-500">de</span>
          <input
              id="totalWeeks" type="number" value={totalWeeks}
              onChange={(e) => setTotalWeeks(parseInt(e.target.value) || 1)}
              min="1" disabled={isLoading}
              className="bg-gray-700 rounded p-1 w-16 text-center text-[var(--color-texto-principal)] disabled:opacity-50"
            />
          <span className="text-[var(--color-texto-secundario)]">Semanas</span>
        </div>

        <button
          onClick={handleUpload}
          disabled={isLoading || !selectedFile}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? 'Procesando...' : 'Procesar Archivo'}
        </button>
      </div>
    </div>
  );
}

export default FileUpload;