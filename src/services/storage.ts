// ============================================================
// SERVIÇO DE ARMAZENAMENTO DE ARQUIVOS (GOOGLE CLOUD STORAGE / LOCAL)
// ============================================================

import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import path from 'path'

let storageClient: Storage | null = null

function getStorageClient(): Storage | null {
  if (storageClient) return storageClient

  try {
    // Inicializar cliente GCS (utiliza Application Default Credentials do GCP ou GOOGLE_APPLICATION_CREDENTIALS)
    storageClient = new Storage()
    return storageClient
  } catch (err) {
    console.warn('Google Cloud Storage não inicializado (modo local ativado):', err)
    return null
  }
}

export interface UploadOptions {
  fileName: string
  mimeType: string
  folder?: string
}

export async function uploadFile(buffer: Buffer, options: UploadOptions): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME
  const folder = options.folder ? `${options.folder}/` : ''
  const destination = `${folder}${Date.now()}_${options.fileName}`

  // 1. Tentar upload para o Google Cloud Storage em Produção
  if (bucketName) {
    const storage = getStorageClient()
    if (storage) {
      const bucket = storage.bucket(bucketName)
      const file = bucket.file(destination)

      await file.save(buffer, {
        metadata: { contentType: options.mimeType },
        resumable: false,
      })

      // Retornar URL pública do GCS
      return `https://storage.googleapis.com/${bucketName}/${destination}`
    }
  }

  // 2. Fallback para Armazenamento Local em Desenvolvimento
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const localFilePath = path.join(uploadsDir, options.fileName)
  fs.writeFileSync(localFilePath, buffer)

  return `/uploads/${options.fileName}`
}
