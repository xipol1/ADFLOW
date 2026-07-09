import { useEffect, useState } from 'react';
import { useUTM } from './hooks/useUTM';
import { wines } from './config/wines';
import { track } from './lib/track';
import { hasAnalyticsConsent, subscribeConsent } from './lib/consent';
import AgeGate from './components/AgeGate';
import JourneyRail, { type Stage } from './components/JourneyRail';
import ChapterBanner from './components/ChapterBanner';
import StickyBar from './components/StickyBar';
import Hero from './components/Hero';
import Carta from './components/Carta';
import WineScene from './components/WineScene';
import Story from './components/Story';
import Benefits from './components/Benefits';
import SocialProof from './components/SocialProof';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';

/**
 * Cinematic wine showcase as a "life of wine" journey: full-bleed photo chapters
 * (pinned) interleaved with clean content. Legal-first (AgeGate fail-closed),
 * one conversion (WhatsApp), measurement only after consent.
 */
const STAGES: Stage[] = [
  { id: 'cap-hero', label: 'El servido' },
  { id: 'cap-vendimia', label: 'Vendimia' },
  { id: 'cap-crianza', label: 'Crianza' },
  { id: 'cap-copa', label: 'La copa' },
];

export default function App() {
  const utm = useUTM();
  const [ageOk, setAgeOk] = useState(false);

  useEffect(() => {
    if (ageOk) track('age_gate_confirmed', { utm });
  }, [ageOk, utm]);

  useEffect(() => {
    const fire = () => { if (hasAnalyticsConsent()) track('page_view', { utm }); };
    fire();
    return subscribeConsent(fire);
  }, [utm]);

  return (
    <>
      <AgeGate onConfirm={() => setAgeOk(true)} />

      <div className="app-shell">
        <JourneyRail stages={STAGES} />
        <StickyBar utm={utm} />
        <main>
          <Hero utm={utm} />                                {/* Cap 0 · El servido */}
          <Carta />

          <ChapterBanner
            id="cap-vendimia"
            kicker="La vida del vino · II"
            title="Vendimia"
            subtitle="De la cepa a la mesa: la uva en su punto, recogida a mano."
            src="/assets/photos/picnic.webp"
            alt="Racimos de uva y copas sobre un mantel claro."
          />

          {wines.map((w, i) => (
            <WineScene key={w.id} wine={w} index={i} utm={utm} flip={i % 2 === 1} />
          ))}

          <ChapterBanner
            id="cap-crianza"
            kicker="La vida del vino · III"
            title="Crianza"
            subtitle="El silencio de la bodega. Madera, tiempo y paciencia en cada barrica."
            src="/assets/photos/barrels.webp"
            alt="Hilera de barricas de roble en una bodega."
            height="190vh"
          />

          <Story />
          <Benefits />
          <SocialProof />
          <FAQ />
          <FinalCTA utm={utm} />                            {/* Cap 4 · La copa */}
        </main>

        <Footer />
        <CookieBanner />
      </div>
    </>
  );
}
