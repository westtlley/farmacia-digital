import fs from 'fs';
import path from 'path';

function ensureWithinRoot(rootDir, targetPath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(targetPath);

  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('Caminho de storage local invalido.');
  }

  return resolvedTarget;
}

export function createLocalStorageProvider({ rootDir }) {
  const resolvedRoot = path.resolve(rootDir);

  function ensureRoot() {
    if (!fs.existsSync(resolvedRoot)) {
      fs.mkdirSync(resolvedRoot, { recursive: true });
    }
  }

  function resolveFilePath(fileKey, legacyFilePath = null) {
    ensureRoot();

    if (legacyFilePath) {
      return ensureWithinRoot(resolvedRoot, legacyFilePath);
    }

    if (!fileKey) {
      throw new Error('Arquivo nao encontrado.');
    }

    return ensureWithinRoot(resolvedRoot, path.join(resolvedRoot, fileKey));
  }

  return {
    name: 'local',
    async uploadBuffer({ key, buffer }) {
      const filePath = resolveFilePath(key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, buffer);

      return {
        storage_provider: 'local',
        file_key: key,
        file_path: filePath,
      };
    },
    async deleteObject({ fileKey, legacyFilePath = null }) {
      const filePath = resolveFilePath(fileKey, legacyFilePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    },
    async getMetadata({ fileKey, legacyFilePath = null }) {
      const filePath = resolveFilePath(fileKey, legacyFilePath);
      const stat = fs.statSync(filePath);
      return {
        contentLength: stat.size,
        lastModified: stat.mtime.toISOString(),
      };
    },
    async openReadStream({ fileKey, legacyFilePath = null }) {
      const filePath = resolveFilePath(fileKey, legacyFilePath);
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo nao encontrado.');
      }

      return {
        stream: fs.createReadStream(filePath),
      };
    },
    async checkHealth() {
      ensureRoot();
      return {
        available: true,
        provider: 'local',
        root_dir: resolvedRoot,
      };
    },
  };
}

export default createLocalStorageProvider;
