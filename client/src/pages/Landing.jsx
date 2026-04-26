import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Film, HardDrive, Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden px-6 py-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="font-display text-2xl font-bold">ShortifyAI</Link>
        <div className="flex gap-3">
          <Link to="/login" className="btn-muted">Login</Link>
          <Link to="/register" className="btn-primary">Start local</Link>
        </div>
      </nav>
      <section className="mx-auto grid max-w-7xl items-center gap-10 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mb-5 inline-flex rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-bold text-mint">
            Ollama + FFmpeg + local storage
          </p>
          <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl">
            Turn ideas into Shorts without renting the cloud.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-frost/70">
            Generate hooks, scripts, voiceovers, thumbnails, captions, and vertical MP4s from your own Windows machine.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="btn-primary" to="/register">Create your studio</Link>
            <Link className="btn-muted" to="/login">Open dashboard</Link>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-[2rem] p-6 shadow-glow">
          <div className="aspect-[9/16] rounded-[1.5rem] bg-gradient-to-br from-ember via-ink to-mint p-5">
            <div className="flex h-full flex-col justify-between rounded-[1rem] bg-ink/45 p-5">
              <Sparkles className="text-mint" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-mint">AI Short</p>
                <h2 className="mt-3 font-display text-4xl font-bold">The hook writes itself.</h2>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
        {[
          ['Script engine', Sparkles, 'Ollama creates title, hook, script, CTA, and hashtags.'],
          ['Video factory', Film, 'FFmpeg combines local backgrounds, captions, and voiceover.'],
          ['Private storage', HardDrive, 'All videos, audio, and thumbnails stay in server folders.']
        ].map(([title, Icon, text]) => (
          <div key={title} className="glass rounded-[1.5rem] p-6">
            <Icon className="text-ember" />
            <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
            <p className="mt-2 text-frost/60">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
