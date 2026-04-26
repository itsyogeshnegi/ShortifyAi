import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    payload: { type: Object, required: true },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'processing', 'completed', 'failed'], default: 'scheduled' },
    attempts: { type: Number, default: 0 },
    errorMessage: { type: String, default: '' }
  },
  { timestamps: true, collection: 'jobs' }
);

export default mongoose.model('Job', jobSchema);
