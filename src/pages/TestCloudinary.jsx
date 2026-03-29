import { useState } from 'react';
import { uploadToCloudinary, getCloudinaryUrl } from '@/config/cloudinary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestCloudinary() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!uploadPreset) {
      setError('Por favor, informe o Upload Preset');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const uploadResult = await uploadToCloudinary(file, {
        folder: 'test',
        uploadPreset: uploadPreset
      });

      setResult(uploadResult);
      setImageUrl(uploadResult.url);
      console.log('✅ Upload bem-sucedido:', uploadResult);
    } catch (err) {
      setError(err.message);
      console.error('❌ Erro no upload:', err);
    } finally {
      setUploading(false);
    }
  };

  const testOptimizedUrl = () => {
    if (!imageUrl) return;
    
    const optimized = getCloudinaryUrl(imageUrl, {
      width: 300,
      height: 300,
      quality: 'auto',
      format: 'auto'
    });
    
    console.log('URL Original:', imageUrl);
    console.log('URL Otimizada:', optimized);
    setImageUrl(optimized);
  };

  const checkConfig = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const configuredUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    console.log('=== Configuração Cloudinary ===');
    console.log('Cloud Name:', cloudName || '❌ Não configurado');
    console.log('Upload Preset:', configuredUploadPreset ? '✅ Configurado' : '❌ Não configurado');
    console.log('==============================');
    
    alert(`Cloud Name: ${cloudName || 'Não configurado'}\nUpload Preset: ${configuredUploadPreset ? 'Configurado' : 'Não configurado'}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Teste Cloudinary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Verificar variáveis de ambiente */}
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-bold mb-2">Variáveis de Ambiente:</h3>
            <div className="space-y-1">
              <p>
                Cloud Name: <span className={import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ? 'text-green-600' : 'text-red-600'}>
                  {import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '❌ Não configurado'}
                </span>
              </p>
              <p>
                Upload Preset: <span className={import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ? 'text-green-600' : 'text-red-600'}>
                  {import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ? '✅ Configurado' : '❌ Não configurado'}
                </span>
              </p>
            </div>
            <Button onClick={checkConfig} className="mt-2" variant="outline">
              Verificar no Console
            </Button>
          </div>

          {/* Upload Preset */}
          <div className="space-y-2">
            <Label htmlFor="uploadPreset">Upload Preset:</Label>
            <Input
              id="uploadPreset"
              type="text"
              placeholder="Nome do seu Upload Preset"
              value={uploadPreset}
              onChange={(e) => setUploadPreset(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Crie um Upload Preset no Cloudinary Dashboard → Settings → Upload
            </p>
          </div>

          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label htmlFor="fileInput">Selecione uma imagem:</Label>
            <Input
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading || !uploadPreset}
              className="cursor-pointer"
            />
          </div>

          {/* Status */}
          {uploading && (
            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200">⏳ Fazendo upload...</p>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg space-y-3">
              <h3 className="font-bold text-green-800 dark:text-green-200">✅ Upload bem-sucedido!</h3>
              <div className="space-y-1 text-sm">
                <p><strong>URL:</strong> <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{result.url}</a></p>
                <p><strong>Public ID:</strong> {result.publicId}</p>
                <p><strong>Dimensões:</strong> {result.width} x {result.height}</p>
              </div>
              
              {imageUrl && (
                <div className="mt-4 space-y-2">
                  <img 
                    src={imageUrl} 
                    alt="Uploaded" 
                    className="max-w-md rounded shadow-lg"
                  />
                  <div className="flex gap-2">
                    <Button onClick={testOptimizedUrl} variant="outline" size="sm">
                      Testar URL Otimizada
                    </Button>
                    <Button 
                      onClick={() => window.open(imageUrl, '_blank')} 
                      variant="outline" 
                      size="sm"
                    >
                      Abrir em Nova Aba
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
              <h3 className="font-bold text-red-800 dark:text-red-200">❌ Erro:</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Instruções */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-bold mb-2">📝 Como usar:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Crie um Upload Preset no Cloudinary Dashboard</li>
              <li>Configure como "Unsigned" para uploads do frontend</li>
              <li>Cole o nome do preset no campo acima</li>
              <li>Selecione uma imagem e faça upload</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
