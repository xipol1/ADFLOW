import { useUTM } from './hooks/useUTM';
import { product } from './config/product';
import StickyBar from './components/StickyBar';
import Hero from './components/Hero';
import Scene from './components/Scene';
import LabelsFan from './components/LabelsFan';
import Benefits from './components/Benefits';
import SocialProof from './components/SocialProof';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';

/**
 * Cinematic bridge page. One objective, one CTA ("Ver en Amazon"), no nav.
 * Scenes use the listing's real product clips; CTA is reachable from second 1
 * (hero above the fold + fixed bottom bar on mobile).
 */
export default function App() {
  const utm = useUTM();

  return (
    <>
      <StickyBar utm={utm} />

      <main>
        <Hero utm={utm} />                                {/* S1 cinematic */}
        <Scene scene={product.scenes.spray} />            {/* S2 Pulveriza. */}
        <Scene scene={product.scenes.pour} flip />        {/* S3 O vierte. */}
        <LabelsFan />                                     {/* S4 etiquetas */}
        <Benefits />                                      {/* S5 + stat */}
        <SocialProof utm={utm} />                         {/* S6 */}
        <FAQ />                                           {/* S7 */}
        <FinalCTA utm={utm} />                            {/* S8 */}
      </main>

      <Footer />
      <CookieBanner />
    </>
  );
}
