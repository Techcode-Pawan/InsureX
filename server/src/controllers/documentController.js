import * as documentService from '../services/documentService.js'

export async function getDocuments(req, res, next) {
  try {
    const docs = await documentService.getDocuments(req.query)
    res.json({ success: true, data: docs })
  } catch (err) {
    next(err)
  }
}

export async function createDocument(req, res, next) {
  try {
    const doc = await documentService.createDocument(req.body)
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
    const doc = await documentService.updateDocument(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Document verification updated.',
      data: doc,
    })
  } catch (err) {
    next(err)
  }
}
