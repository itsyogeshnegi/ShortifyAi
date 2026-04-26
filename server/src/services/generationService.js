import Project from '../models/Project.js';
import Script from '../models/Script.js';
import { generateScriptWithOllama } from './ollamaService.js';
import { generateVoiceAudio } from './ttsService.js';
import { generateThumbnail } from './thumbnailService.js';
import { generateShortVideo } from './videoService.js';
import { findAndDownloadPexelsBackground } from './pexelsService.js';

async function updateProgress(project, stage, percent, message, extra = {}) {
  project.progressStage = stage;
  project.progressPercent = percent;
  project.progressMessage = message;
  Object.assign(project, extra);
  await project.save();
}

export async function runGenerationPipeline({ userId, projectId, input }) {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, user: userId },
    {
      status: 'generating',
      errorMessage: '',
      progressStage: 'script',
      progressPercent: 15,
      progressMessage: 'Generating viral script with Ollama.'
    },
    { new: true }
  );

  if (!project) throw new Error('Project not found for generation');

  try {
    const generated = await generateScriptWithOllama(input);
    await updateProgress(project, 'background', 30, 'Finding a related Pexels background video.');

    const background = await findAndDownloadPexelsBackground(input);
    const script = await Script.create({ user: userId, ...input, ...generated });
    await updateProgress(project, 'voice', 45, 'Creating voiceover audio locally.');

    const audio = await generateVoiceAudio(`${generated.hook}. ${generated.fullScript}. ${generated.cta}`, generated.title);
    await updateProgress(project, 'thumbnail', 60, 'Generating thumbnail image.');

    const thumb = await generateThumbnail(generated.title);
    await updateProgress(project, 'video', 80, 'Rendering final vertical MP4 with FFmpeg.');

    const video = await generateShortVideo({
      title: generated.title,
      scriptText: `${generated.hook}. ${generated.fullScript}. ${generated.cta}`,
      duration: input.duration,
      audioPath: audio.path,
      topic: input.topic,
      niche: input.niche,
      tone: input.tone,
      backgroundPath: background?.path
    });

    project.script = script._id;
    project.title = generated.title;
    project.hook = generated.hook;
    project.cta = generated.cta;
    project.hashtags = generated.hashtags;
    project.media = {
      videoFilename: video.filename,
      audioFilename: audio.filename,
      thumbFilename: thumb.filename,
      subtitleFilename: video.subtitleFilename,
      backgroundFilename: background?.filename,
      backgroundProvider: background?.provider,
      backgroundSourceUrl: background?.sourceUrl,
      backgroundCredit: background?.credit,
      backgroundCreditUrl: background?.creditUrl
    };
    project.status = 'completed';
    project.progressStage = 'completed';
    project.progressPercent = 100;
    project.progressMessage = 'Video ready to preview and download.';
    project.completedAt = new Date();
    await project.save();
    return project.populate('script');
  } catch (error) {
    project.status = 'failed';
    project.errorMessage = error.message;
    project.progressStage = 'failed';
    project.progressMessage = error.message;
    await project.save();
    throw error;
  }
}
