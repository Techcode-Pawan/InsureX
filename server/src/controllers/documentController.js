import * as documentService from '../services/documentService.js'

export async function getDocuments(req, res, next) {
  try {
    const result = await documentService.getDocuments(req.query)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function createDocument(req, res, next) {
  try {
    const doc = await documentService.createDocument(req.body, req.user)
    res.status(201).json({
      success: true,
      message: 'Document record logged successfully.',
      data: doc,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateDocument(req, res, next) {
  try {
    const { verificationStatus, verificationNotes, ...rest } = req.body
    const doc = verificationStatus
      ? await documentService.reviewDocument(req.params.id, { verificationStatus, verificationNotes }, req.user)
      : await documentService.updateDocument(req.params.id, rest)
    res.json({
      success: true,
      message: 'Document verification updated.',
      data: doc,
    })
  } catch (err) {
    next(err)
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const { abs, downloadName } = await documentService.resolveDownload(req.params.id)
    res.download(abs, downloadName)
  } catch (err) {
    next(err)
  }
}
