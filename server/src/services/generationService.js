import Project from '../models/Project.js';
import Script from '../models/Script.js';
import { generateScriptWithOllama } from './ollamaService.js';
import { generateVoiceAudio } from './ttsService.js';
import { generateThumbnail } from './thumbnailService.js';
import { generateShortVideo } from './videoService.js';
import { findAndDownloadPexelsBackgrounds } from './pexelsService.js';
import { createAmbientBed } from './ambientAudioService.js';
import { getSceneCountForDuration } from './themeTemplateService.js';

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
  let ambient = null;

  try {
    const generated = await generateScriptWithOllama(input);
    await updateProgress(project, 'background', 30, 'Finding multiple script-matched Pexels scene clips.');

    const backgrounds = await findAndDownloadPexelsBackgrounds({ input, generated });
    const script = await Script.create({ user: userId, ...input, ...generated });
    await updateProgress(project, 'voice', 45, 'Creating a natural voiceover.');

    const audio = await generateVoiceAudio(generated.voiceScript, generated.title, input.language);
    const requestedDuration = Number(input.duration) || 30;
    const renderDuration = audio.duration
      ? Number((audio.duration + 0.8).toFixed(2))
      : requestedDuration;
    await updateProgress(project, 'sound', 55, 'Adding ambient bed and aggressive motion SFX.');
    ambient = await createAmbientBed({
      themeTemplate: input.themeTemplate,
      niche: input.niche,
      duration: renderDuration,
      title: generated.title
    });
    await updateProgress(project, 'thumbnail', 60, 'Generating thumbnail image.');

    const thumb = await generateThumbnail(generated.title);
    await updateProgress(project, 'video', 80, 'Rendering final vertical MP4 with FFmpeg.');

    const video = await generateShortVideo({
      title: generated.title,
      scriptText: audio.speechText,
      subtitleTimeline: audio.timeline,
      duration: renderDuration,
      speechDuration: audio.duration,
      audioPath: audio.path,
      ambientAudioPath: ambient.path,
      topic: input.topic,
      niche: input.niche,
      tone: input.tone,
      themeTemplate: input.themeTemplate,
      sceneCount: getSceneCountForDuration(input.duration),
      backgroundPaths: backgrounds.map((background) => background.path)
    });
    project.script = script._id;
    project.themeTemplate = input.themeTemplate;
    project.title = generated.title;
    project.hook = generated.hook;
    project.cta = generated.cta;
    project.hashtags = generated.hashtags;
    project.media = {
      videoFilename: video.filename,
      audioFilename: audio.filename,
      thumbFilename: thumb.filename,
      subtitleFilename: video.subtitleFilename,
      backgroundFilename: backgrounds[0]?.filename,
      backgroundProvider: backgrounds[0]?.provider,
      backgroundSourceUrl: backgrounds[0]?.sourceUrl,
      backgroundCredit: backgrounds[0]?.credit,
      backgroundCreditUrl: backgrounds[0]?.creditUrl,
      backgrounds: backgrounds.map((background) => ({
        filename: background.filename,
        provider: background.provider,
        sourceUrl: background.sourceUrl,
        credit: background.credit,
        creditUrl: background.creditUrl,
        segmentIndex: background.segmentIndex
      }))
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
  } finally {
    if (ambient) {
      await ambient.cleanup().catch(() => {});
    }
  }
}
