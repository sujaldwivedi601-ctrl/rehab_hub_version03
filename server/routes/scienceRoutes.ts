import { Router } from 'express';
import { ScienceController } from '../controllers/scienceController.js';

const router = Router();

// GET /api/v1/science/protocols - Evidence-based neurorehabilitation protocols from PubMed & ClinicalTrials.gov
router.get('/protocols', ScienceController.getNeuroRehabEvidence);

export default router;
