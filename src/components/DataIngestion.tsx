import React, { useCallback, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const UPLOAD_URL = '/api/admin/upload';

const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.csv'] as const;

type UploadStatus = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

const isAcceptedFile = (file: File): boolean => {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number]);
};

export const DataIngestion: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setStatus('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;

    if (!isAcceptedFile(file)) {
      setErrorMessage(
        `Unsupported file type. Please upload ${ACCEPTED_EXTENSIONS.join(', ')} files only.`,
      );
      setStatus('error');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setStatus('selected');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const detail =
          typeof errorBody?.detail === 'string'
            ? errorBody.detail
            : `Upload failed with status ${response.status}`;
        throw new Error(detail);
      }

      const data = await response.json();
      setStatus('success');
      setSuccessMessage(
        data.message ?? 'File uploaded successfully. Ingestion started in background.',
      );
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Upload failed. Please try again.',
      );
    }
  };

  return (
    <Card className="shadow-medical border-primary/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Medical Document Ingestion</CardTitle>
            <CardDescription>
              Upload clinical guidelines and reference documents into the RAG knowledge base.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300',
            isDragOver
              ? 'border-primary bg-primary-soft scale-[1.01] shadow-medical'
              : 'border-border bg-gradient-card hover:border-primary/50 hover:bg-primary-soft/40',
            status === 'uploading' && 'pointer-events-none opacity-70',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleInputChange}
            disabled={status === 'uploading'}
          />

          <div
            className={cn(
              'mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors',
              isDragOver ? 'bg-primary text-white' : 'bg-muted text-primary',
            )}
          >
            {status === 'uploading' ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
          </div>

          <p className="text-lg font-semibold text-foreground">
            {isDragOver ? 'Drop your file here' : 'Drag & drop a document'}
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            or click to browse. Supported formats: TXT, Markdown, PDF, and CSV.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ACCEPTED_EXTENSIONS.map((ext) => (
              <Badge key={ext} variant="outline" className="text-xs uppercase">
                {ext.replace('.', '')}
              </Badge>
            ))}
          </div>
        </div>

        {selectedFile && status !== 'idle' && (
          <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  {status === 'selected' && `${selectedFile.name} selected`}
                  {status === 'uploading' && `Uploading ${selectedFile.name}…`}
                  {status === 'success' && `${selectedFile.name} uploaded`}
                  {status === 'error' && selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            {status === 'selected' && (
              <Button variant="ghost" size="icon" onClick={resetState} aria-label="Clear file">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {status === 'success' && successMessage && (
          <Alert className="border-accent/30 bg-accent-soft">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            <AlertTitle className="text-accent">Ingestion started</AlertTitle>
            <AlertDescription className="text-foreground">{successMessage}</AlertDescription>
          </Alert>
        )}

        {status === 'error' && errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {(status === 'success' || status === 'error') && (
            <Button variant="outline" onClick={resetState}>
              Upload another file
            </Button>
          )}

          <Button
            variant="medical"
            onClick={handleUpload}
            disabled={!selectedFile || status === 'uploading' || status === 'success'}
            className="min-w-[160px]"
          >
            {status === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Start Ingestion
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
