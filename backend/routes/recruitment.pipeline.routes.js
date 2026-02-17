const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.jwt');
const pipelineCtrl = require('../controllers/pipeline.controller');

router.use(auth.authenticate);
router.use(auth.requireHr);

// Template Management
router.get('/templates', pipelineCtrl.getTemplates);
router.post('/templates', pipelineCtrl.createTemplate);
router.put('/templates/:id', pipelineCtrl.updateTemplate);
router.delete('/templates/:id', pipelineCtrl.deleteTemplate);

// Job Pipeline Management
router.get('/job/:jobId', pipelineCtrl.getJobPipeline);
router.put('/job/:jobId/reorder', pipelineCtrl.reorderJobPipeline);
router.post('/job/:jobId/stage', pipelineCtrl.addJobStage);
router.put('/job/:jobId/stage/:stageId', pipelineCtrl.updateJobStage);
router.delete('/job/:jobId/stage/:stageId', pipelineCtrl.deleteJobStage);

// Candidate Movement & History
router.post('/applicant/:applicantId/move', pipelineCtrl.moveCandidate);
router.get('/applicant/:applicantId/history', pipelineCtrl.getCandidateHistory);

module.exports = router;
