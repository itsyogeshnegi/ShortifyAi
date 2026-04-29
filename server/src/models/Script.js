import mongoose from 'mongoose';

const scriptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    niche: { type: String, required: true },
    tone: { type: String, required: true },
    duration: { type: Number, enum: [15, 30, 60], required: true },
    language: { type: String, required: true },
    themeTemplate: { type: String, default: 'money-success' },
    title: { type: String, required: true },
    hook: { type: String, required: true },
    fullScript: { type: String, required: true },
    voiceScript: { type: String, required: true },
    cta: { type: String, required: true },
    hashtags: [{ type: String }]
  },
  { timestamps: true, collection: 'scripts' }
);

export default mongoose.model('Script', scriptSchema);
