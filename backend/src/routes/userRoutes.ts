// ============================================================
// CrisisAlpha — User Routes
// REST API for user profiles & attachment points
// ============================================================

import { Router, Request, Response } from 'express';
import {
  createOrUpdateProfile, getProfile, addAttachmentPoint,
  removeAttachmentPoint, getIndustryTemplate, getAllUsers,
} from '../services/userContextService';

const router = Router();

// POST /api/user/profile — create or update user profile
router.post('/profile', (req: Request, res: Response) => {
  const { id, companyName, industry, headquartersCountry, profileTier } = req.body;

  if (!companyName || !industry || !headquartersCountry) {
    return res.status(400).json({
      error: 'Missing required fields: companyName, industry, headquartersCountry',
    });
  }

  const profile = createOrUpdateProfile({
    id,
    companyName,
    industry,
    headquartersCountry,
    profileTier,
  });

  res.json(profile);
});

// GET /api/user/profile/:id — get user profile
router.get('/profile/:id', (req: Request, res: Response) => {
  const profile = getProfile(req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  res.json(profile);
});

// GET /api/user/profiles — list all profiles
router.get('/profiles', (req: Request, res: Response) => {
  const users = getAllUsers();
  res.json({
    count: users.length,
    users: users.map(u => ({
      id: u.id,
      companyName: u.companyName,
      industry: u.industry,
      headquartersCountry: u.headquartersCountry,
      profileTier: u.profileTier,
      attachmentCount: u.attachmentPoints.length,
    })),
  });
});

// POST /api/user/attachments — add attachment point
router.post('/attachments', (req: Request, res: Response) => {
  const { userId, hubId, relationship, goodsCategory, dependencyStrength, hasAlternative, alternativeHubId, switchCostDays, monthlyVolume, monthlyValueUsd } = req.body;

  if (!userId || !hubId || !relationship || !goodsCategory) {
    return res.status(400).json({
      error: 'Missing required fields: userId, hubId, relationship, goodsCategory',
    });
  }

  const attachment = addAttachmentPoint(userId, {
    hubId,
    relationship,
    goodsCategory,
    dependencyStrength: dependencyStrength || 'medium',
    hasAlternative: hasAlternative || false,
    alternativeHubId,
    switchCostDays,
    monthlyVolume,
    monthlyValueUsd,
  });

  if (!attachment) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(attachment);
});

// DELETE /api/user/attachments/:userId/:attachmentId — remove attachment point
router.delete('/attachments/:userId/:attachmentId', (req: Request, res: Response) => {
  const success = removeAttachmentPoint(req.params.userId, req.params.attachmentId);
  if (!success) {
    return res.status(404).json({ error: 'User or attachment not found' });
  }
  res.json({ success: true });
});

// GET /api/user/industry-template/:industry — get auto-generated template
router.get('/industry-template/:industry', (req: Request, res: Response) => {
  const template = getIndustryTemplate(req.params.industry);
  if (!template) {
    return res.status(404).json({
      error: 'Industry template not found',
      availableIndustries: ['automotive', 'energy', 'pharma', 'consumer_goods', 'semiconductors', 'agriculture'],
    });
  }
  res.json(template);
});

export default router;
