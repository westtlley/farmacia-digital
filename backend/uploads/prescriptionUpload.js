import path from 'path';

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

const FILE_SIGNATURES = {
  'application/pdf': {
    extensions: ['pdf'],
    matches(buffer) {
      return buffer.subarray(0, 5).toString('utf8') === '%PDF-';
    },
  },
  'image/jpeg': {
    extensions: ['jpg', 'jpeg'],
    matches(buffer) {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    },
  },
  'image/png': {
    extensions: ['png'],
    matches(buffer) {
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    },
  },
  'image/webp': {
    extensions: ['webp'],
    matches(buffer) {
      return (
        buffer.subarray(0, 4).toString('utf8') === 'RIFF' &&
        buffer.subarray(8, 12).toString('utf8') === 'WEBP'
      );
    },
  },
};

export function normalizePrescriptionMimeType(mimeType = '') {
  const normalized = String(mimeType).trim().toLowerCase();
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

export function sanitizeUploadFilename(filename = 'receita') {
  const baseName = path.parse(String(filename || 'receita')).name || 'receita';
  return (
    baseName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'receita'
  );
}

function getNormalizedExtension(filename = '') {
  const rawExtension = path.extname(filename).replace('.', '').trim().toLowerCase();
  if (rawExtension === 'jpg') {
    return 'jpeg';
  }

  return rawExtension;
}

function assertBase64Content(contentBase64) {
  const normalized = String(contentBase64 || '')
    .trim()
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');

  if (!normalized) {
    throw new Error('Arquivo da receita vazio.');
  }

  if (!/^[a-zA-Z0-9+/=]+$/.test(normalized)) {
    throw new Error('Arquivo da receita invalido.');
  }

  return normalized;
}

function getMaxPrescriptionUploadBytes() {
  const parsed = Number(process.env.MAX_PRESCRIPTION_UPLOAD_BYTES || DEFAULT_MAX_BYTES);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
}

export function validateAndDecodePrescriptionUpload({
  contentBase64,
  mimeType,
  originalFilename,
}) {
  const normalizedMimeType = normalizePrescriptionMimeType(mimeType);
  const signature = FILE_SIGNATURES[normalizedMimeType];
  if (!signature) {
    throw new Error('Formato de arquivo nao suportado. Use PDF, JPG, PNG ou WEBP.');
  }

  const filename = String(originalFilename || '').trim();
  if (!filename || filename.length > 255) {
    throw new Error('Nome original do arquivo da receita e obrigatorio.');
  }

  if (filename.includes('\0') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Nome do arquivo da receita invalido.');
  }

  const normalizedBase64 = assertBase64Content(contentBase64);

  let buffer;
  try {
    buffer = Buffer.from(normalizedBase64, 'base64');
  } catch (error) {
    throw new Error('Arquivo da receita invalido.');
  }

  if (!buffer.length) {
    throw new Error('Arquivo da receita vazio.');
  }

  const maxBytes = getMaxPrescriptionUploadBytes();
  if (buffer.length > maxBytes) {
    throw new Error(`Arquivo muito grande. Limite de ${Math.floor(maxBytes / (1024 * 1024))}MB.`);
  }

  if (!signature.matches(buffer)) {
    throw new Error('O conteudo do arquivo nao corresponde ao tipo enviado.');
  }

  const extensionFromFilename = getNormalizedExtension(filename);
  if (extensionFromFilename && !signature.extensions.includes(extensionFromFilename)) {
    throw new Error('A extensao do arquivo nao corresponde ao tipo MIME enviado.');
  }

  const canonicalExtension = signature.extensions[0] === 'jpeg' ? 'jpg' : signature.extensions[0];

  return {
    buffer,
    normalizedMimeType,
    sizeBytes: buffer.length,
    extension: canonicalExtension,
    safeFilenameBase: sanitizeUploadFilename(filename),
    originalFilename: filename,
  };
}

export function buildPrescriptionStorageKey({ uploadId, safeFilenameBase, extension, uploadedAt }) {
  const date = uploadedAt ? new Date(uploadedAt) : new Date();
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `prescriptions/${year}/${month}/${uploadId}_${safeFilenameBase}.${extension}`;
}
