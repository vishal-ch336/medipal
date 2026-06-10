import React, { useCallback, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
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
  LogOut,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authHeaders } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

const UPLOAD_URL = '/api/admin/upload';

const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.csv'] as const;

type UploadStatus = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

const isAcceptedFile = (file: File): boolean => {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number]);
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DataIngestion: React.FC = () => {
  const { user, token, logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = !!user && user.role === 'admin';

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    resetState();
  };

  const resetState = () => {
    setSelectedFiles([]);
    setStatus('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFiles = useCallback((incomingFiles: FileList | File[]) => {
    const files = Array.from(incomingFiles);
    if (files.length === 0) return;

    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      if (isAcceptedFile(file)) {
        accepted.push(file);
      } else {
        rejected.push(file.name);
      }
    }

    if (rejected.length > 0) {
      setErrorMessage(
        `Skipped unsupported file(s): ${rejected.join(', ')}. Supported: ${ACCEPTED_EXTENSIONS.join(', ')}`,
      );
    } else {
      setErrorMessage(null);
    }

    if (accepted.length > 0) {
      setSelectedFiles((prev) => {
        const existing = new Set(prev.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
        const unique = accepted.filter(
          (f) => !existing.has(`${f.name}_${f.size}_${f.lastModified}`),
        );
        return [...prev, ...unique];
      });
      setStatus('selected');
      setSuccessMessage(null);
    }
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setStatus('idle');
        setErrorMessage(null);
      }
      return next;
    });
  };

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

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    if (!token || !isAdmin) {
      setErrorMessage('Please sign in as an administrator before uploading.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append('files', file);
    }

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please sign in again.');
      }

      if (response.status === 403) {
        throw new Error('Only administrators have access to this resource.');
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const detail =
          typeof errorBody?.detail === 'string'
            ? errorBody.detail
            : typeof errorBody?.detail?.message === 'string'
              ? errorBody.detail.message
              : `Upload failed with status ${response.status}`;
        throw new Error(detail);
      }

      const data = await response.json();
      setStatus('success');
      setSuccessMessage(
        data.message ?? `${selectedFiles.length} file(s) uploaded successfully. Ingestion started in background.`,
      );
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Upload failed. Please try again.',
      );
    }
  };

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  if (!user || !isAdmin) {
    return (
      <Card className="shadow-medical border-primary/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Administrator access required</CardTitle>
              <CardDescription>
                {user
                  ? 'Your account does not have permission to upload documents.'
                  : 'Sign in with an admin account to upload documents.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          {!user && (
            <Button variant="medical" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          )}
          {user && (
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medical border-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
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
          <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
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
            multiple
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
            {isDragOver ? 'Drop your files here' : 'Drag & drop documents'}
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            or click to browse. Select multiple files at once. Supported formats: TXT, Markdown, PDF, and CSV.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ACCEPTED_EXTENSIONS.map((ext) => (
              <Badge key={ext} variant="outline" className="text-xs uppercase">
                {ext.replace('.', '')}
              </Badge>
            ))}
          </div>
        </div>

        {selectedFiles.length > 0 && status !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-medium text-muted-foreground">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                <span className="ml-2 text-xs">({formatFileSize(totalSize)} total)</span>
              </p>
              {status === 'selected' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="max-h-[240px] space-y-1.5 overflow-y-auto rounded-lg border bg-white p-2 shadow-card">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}_${file.size}_${file.lastModified}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <div className="overflow-hidden text-left">
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  {status === 'selected' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
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
              Upload more files
            </Button>
          )}

          <Button
            variant="medical"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || status === 'uploading' || status === 'success'}
            className="min-w-[160px]"
          >
            {status === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Start Ingestion{selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
