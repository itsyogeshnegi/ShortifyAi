import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    script: { type: mongoose.Schema.Types.ObjectId, ref: 'Script' },
    topic: { type: String, required: true },
    niche: { type: String, required: true },
    tone: { type: String, required: true },
    duration: { type: Number, enum: [15, 30, 60], required: true },
    language: { type: String, required: true },
    title: { type: String, default: 'Untitled short' },
    hook: { type: String, default: '' },
    cta: { type: String, default: '' },
    hashtags: [{ type: String }],
    status: {
      type: String,
      enum: ['queued', 'scheduled', 'generating', 'completed', 'failed', 'expired'],
      default: 'queued'
    },
    errorMessage: { type: String, default: '' },
    media: {
      videoFilename: String,
      audioFilename: String,
      thumbFilename: String,
      subtitleFilename: String,
      backgroundFilename: String,
      backgroundProvider: String,
      backgroundSourceUrl: String,
      backgroundCredit: String,
      backgroundCreditUrl: String
    },
    progressStage: { type: String, default: 'queued' },
    progressPercent: { type: Number, default: 0 },
    progressMessage: { type: String, default: 'Project queued.' },
    downloads: { type: Number, default: 0 },
    youtube: {
      status: {
        type: String,
        enum: ['not_uploaded', 'uploading', 'uploaded', 'scheduled', 'failed'],
        default: 'not_uploaded'
      },
      videoId: String,
      watchUrl: String,
      title: String,
      description: String,
      tags: [{ type: String }],
      privacyStatus: String,
      scheduledPublishAt: Date,
      uploadedAt: Date,
      errorMessage: String
    },
    scheduledFor: Date,
    completedAt: Date
  },
  { timestamps: true, collection: 'projects' }
);

export default mongoose.model('Project', projectSchema);
