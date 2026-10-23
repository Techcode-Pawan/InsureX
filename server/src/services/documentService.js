import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import multer from 'multer'
import prisma from '../config/db.js'
import { env } from '../config/env.js'
import { AppError } from '../middleware/errorHandler.js'
import { uniqueNumber, paginate, pageResult } from '../lib/common.js'
import { recordEvent } from '../lib/events.js'

const ALLOWED = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}
const MAX_BYTES = 5 * 1024 * 1024

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true })

// Files are stored outside any static directory under random names and are only served
// through the authorised download endpoint.
export const uploadSingle = multer({
  storage: multer.diskStorage({
    destination: env.UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.${ALLOWED[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new AppError('Only PDF, PNG or JPEG files are accepted.', 400))
    cb(null, true)
  },
}).single('file')

// Verify magic bytes so a renamed executable cannot be stored as a "PDF".
function sniffMatches(filePath, ext) {
  const buf = Buffer.alloc(8)
  const fd = fs.openSync(filePath, 'r')
  fs.readSync(fd, buf, 0, 8, 0)
  fs.closeSync(fd)
  if (ext === 'pdf') return buf.subarray(0, 4).toString() === '%PDF'
  if (ext === 'png') return buf.readUInt32BE(0) === 0x89504e47
  if (ext === 'jpg') return buf[0] === 0xff && buf[1] === 0xd8
  return false
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

export async function getDocuments({ search, status, type, customerId, ...query }, scope = {}) {
  const pg = paginate(query, { defaultLimit: 20 })
  const where = { AND: [scope] }
  if (status) where.verificationStatus = status
  if (type) where.documentType = type
  if (customerId) where.customerId = customerId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { documentNumber: { contains: search, mode: 'insensitive' } },
      { customer: { firstName: { contains: search, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [total, docs] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      skip: pg.skip,
      take: pg.take,
      orderBy: { submissionDate: 'desc' },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, customerNumber: true } },
        policy: { select: { id: true, policyNumber: true } },
        claim: { select: { id: true, claimNumber: true } },
      },
    }),
  ])
  return pageResult(pg, total, docs.map(({ fileUrl, ...d }) => ({ ...d, hasFile: Boolean(fileUrl) })))
}

export async function createDocument(data, actor = null) {
  const documentNumber = await uniqueNumber('DOC', 'document', 'documentNumber')
  const doc = await prisma.document.create({ data: { ...data, documentNumber } })
  await recordEvent({
    actor, action: 'DOCUMENT_ADDED', entityType: 'Document', entityId: doc.id,
    customerId: doc.customerId, summary: `Document ${documentNumber} (${doc.documentType}) recorded.`,
  })
  return doc
}

/**
 * Stores an uploaded file as a Document. The caller must already have verified that
 * `customerId` is one the actor may act for; policy/claim links are checked here to belong
 * to that same customer.
 */
export async function createUploadedDocument({ file, meta, customerId }, actor) {
  if (!file) throw new AppError('Choose a file to upload.', 400)
  const removeFile = () => fs.promises.unlink(file.path).catch(() => {})
  try {
    if (!sniffMatches(file.path, ALLOWED[file.mimetype])) {
      throw new AppError('The file content does not match its type.', 400)
    }
    if (meta.policyId) {
      const p = await prisma.insurancePolicy.findFirst({ where: { id: meta.policyId, customerId }, select: { id: true } })
      if (!p) throw new AppError('Policy not found.', 404)
    }
    if (meta.claimId) {
      const c = await prisma.claim.findFirst({ where: { id: meta.claimId, customerId }, select: { id: true } })
      if (!c) throw new AppError('Claim not found.', 404)
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { assignedAgentId: true } })
    const documentNumber = await uniqueNumber('DOC', 'document', 'documentNumber')
    const doc = await prisma.document.create({
      data: {
        documentNumber,
        name: meta.name,
        documentType: meta.documentType,
        customerId,
        policyId: meta.policyId || null,
        claimId: meta.claimId || null,
        fileFormat: ALLOWED[file.mimetype].toUpperCase(),
        fileSize: formatSize(file.size),
        fileUrl: path.basename(file.path),
        verificationStatus: 'PENDING',
      },
    })
    await recordEvent({
      actor,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: doc.id,
      customerId,
      agentId: customer?.assignedAgentId,
      summary: `Document ${documentNumber} (${doc.documentType}) uploaded for verification.`,
      notifyAgent: actor.role === 'CUSTOMER'
        ? { title: 'Customer uploaded a document', message: `${doc.name} (${documentNumber}) is awaiting verification.`, link: '/agent/documents' }
        : undefined,
    })
    const { fileUrl: _f, ...safe } = doc
    return { ...safe, hasFile: true }
  } catch (err) {
    await removeFile()
    throw err
  }
}

// Returns the absolute path of a stored file after the caller has scoped the lookup.
export async function resolveDownload(id, scope = {}) {
  const doc = await prisma.document.findFirst({ where: { AND: [{ id }, scope] } })
  if (!doc) throw new AppError('Document not found.', 404)
  if (!doc.fileUrl) throw new AppError('No file is stored for this document.', 404)
  const stored = path.basename(doc.fileUrl) // never allow path traversal from DB content
  const abs = path.join(env.UPLOAD_DIR, stored)
  if (!fs.existsSync(abs)) throw new AppError('The stored file is missing.', 404)
  return { abs, downloadName: `${doc.documentNumber}-${doc.name.replace(/[^\w.-]+/g, '_')}.${stored.split('.').pop()}` }
}

export async function reviewDocument(id, { verificationStatus, verificationNotes }, actor, scope = {}) {
  const doc = await prisma.document.findFirst({ where: { AND: [{ id }, scope] } })
  if (!doc) throw new AppError('Document not found.', 404)
  if (['VERIFIED', 'REJECTED'].includes(doc.verificationStatus) && actor.role !== 'ADMIN') {
    throw new AppError('This document has already been finalised.', 409)
  }

  const isFinal = ['VERIFIED', 'REJECTED'].includes(verificationStatus)
  const updated = await prisma.document.update({
    where: { id },
    data: {
      verificationStatus,
      verificationNotes: verificationNotes ?? doc.verificationNotes,
      verifiedBy: isFinal ? actor.name : doc.verifiedBy,
      verifiedDate: isFinal ? new Date() : doc.verifiedDate,
    },
  })
  const label = { VERIFIED: 'verified', REJECTED: 'rejected', NEEDS_INFO: 'needs more information', PENDING: 'pending review' }[verificationStatus]
  await recordEvent({
    actor,
    action: `DOCUMENT_${verificationStatus}`,
    entityType: 'Document',
    entityId: id,
    customerId: doc.customerId,
    summary: `Document ${doc.documentNumber} marked ${label}.`,
    notifyCustomer: { title: 'Document update', message: `${doc.name} (${doc.documentNumber}) is ${label}.${verificationNotes ? ` Note: ${verificationNotes}` : ''}`, link: '/user/documents' },
  })
  const { fileUrl, ...safe } = updated
  return { ...safe, hasFile: Boolean(fileUrl) }
}

export async function updateDocument(id, data) {
  const { customerId: _c, ...safe } = data
  return prisma.document.update({ where: { id }, data: safe })
}
