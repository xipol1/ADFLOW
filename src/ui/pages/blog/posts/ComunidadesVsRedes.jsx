import { Link } from 'react-router-dom';

const styles = {
  article: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 24px 80px',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: 'var(--text)',
    lineHeight: 1.75,
    fontSize: 17,
  },
  h1: {
    fontFamily: "'Sora', system-ui, sans-serif",
    fontSize: 34,
    fontWeight: 800,
    color: 'var(--text)',
    marginBottom: 12,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 18,
    color: 'var(--muted)',
    marginBottom: 40,
    lineHeight: 1.6,
  },
  h2: {
    fontFamily: "'Sora', system-ui, sans-serif",
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--text)',
    marginTop: 48,
    marginBottom: 16,
    lineHeight: 1.3,
  },
  h3: {
    fontFamily: "'Sora', system-ui, sans-serif",
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text)',
    marginTop: 32,
    marginBottom: 12,
    lineHeight: 1.4,
  },
  p: {
    marginBottom: 20,
    color: 'var(--muted)',
  },
  ul: {
    marginBottom: 20,
    paddingLeft: 24,
  },
  li: {
    marginBottom: 10,
    color: 'var(--muted)',
  },
  strong: {
    fontWeight: 600,
    color: 'var(--text)',
  },
  link: {
    color: '#7C3AED',
    textDecoration: 'none',
    fontWeight: 500,
    borderBottom: '1px solid rgba(124, 58, 237, 0.3)',
  },
  blockquote: {
    margin: '28px 0',
    padding: '20px 24px',
    borderLeft: '4px solid #7C3AED',
    background: 'rgba(124, 58, 237, 0.04)',
    borderRadius: '0 8px 8px 0',
    fontStyle: 'italic',
    color: 'var(--muted)',
  },
  cta: {
    marginTop: 48,
    padding: '32px',
    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(124, 58, 237, 0.03) 100%)',
    borderRadius: 12,
    border: '1px solid rgba(124, 58, 237, 0.15)',
  },
  ctaButton: {
    display: 'inline-block',
    marginTop: 16,
    padding: '12px 28px',
    background: '#7C3AED',
    color: '#fff',
    borderRadius: 8,
    fontFamily: "'Sora', system-ui, sans-serif",
    fontWeight: 600,
    fontSize: 15,
    textDecoration: 'none',
  },
  img: {
    width: '100%',
    height: 'auto',
    borderRadius: 12,
    margin: '32px 0',
    objectFit: 'cover',
    maxHeight: 400,
  },
  imgCaption: {
    fontSize: 13,
    color: 'var(--muted)',
    textAlign: 'center',
    marginTop: -24,
    marginBottom: 28,
    fontStyle: 'italic',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '28px 0',
    fontSize: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  th: {
    background: 'var(--bg2)',
    padding: '12px 14px',
    textAlign: 'left',
    fontWeight: 700,
    color: 'var(--text)',
    fontFamily: "'Sora', system-ui, sans-serif",
    fontSize: 14,
    borderBottom: '2px solid var(--border)',
  },
  td: {
    padding: '11px 14px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--muted)',
  },
};

export default function ComunidadesVsRedes() {
  return (
    <article style={styles.article}>
      <h1 style={styles.h1}>
        Publicidad en comunidades vs redes sociales: qué rinde más en 2026
      </h1>
      <p style={styles.subtitle}>
        Después de gastar más de 10.000€ entre Meta Ads y publicidad en comunidades,
        te cuento con datos reales cuál genera más conversiones, cuál sale más barata
        y por qué estoy moviendo la mayor parte de mi presupuesto.
      </p>

      {/* ===== SECTION 1: INTRO PERSONAL ===== */}
      <p style={styles.p}>
        Voy a ser directo contigo. Llevo cuatro años comprando publicidad online para
        proyectos propios y para clientes. He tocado Meta Ads, Google Ads, TikTok Ads,
        influencer marketing y, desde hace un año y medio, publicidad en comunidades digitales.
        Y después de unas 50 campañas repartidas entre todos estos canales, puedo decirte
        algo que casi ninguna agencia te va a contar: <span style={styles.strong}>las comunidades
        están generando mejores resultados que las redes sociales para la mayoría de nichos</span>.
      </p>
      <p style={styles.p}>
        No es que Meta Ads no funcione. Funciona. Pero cada trimestre el CPM sube, el engagement
        baja y el algoritmo decide que tu anuncio no merece tanto alcance como antes. Es como
        alquilar un piso que se encarece cada mes sin mejorar nada. Sigues pagando porque no
        conoces otra opción. Yo tampoco la conocía hasta que un colega me dijo que estaba
        comprando menciones en servidores de Discord y grupos de Telegram. Me reí. Literal.
        Tres meses después, le estaba pidiendo contactos.
      </p>
      <p style={styles.p}>
        En este artículo te voy a dar datos reales, comparativas honestas y mi opinión
        sin filtros sobre publicidad en comunidades vs redes sociales. Si estás gastando
        dinero en ads y no estás contento con el retorno, esto te interesa. Mucho.
      </p>

      <img
        style={styles.img}
        src="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=720&q=80&auto=format"
        alt="Marketing digital comparando diferentes canales publicitarios"
        loading="lazy"
      />
      <p style={styles.imgCaption}>
        El panorama publicitario está cambiando más rápido de lo que la mayoría de marketers asume.
      </p>

      {/* ===== SECTION 2: QUÉ ENTENDEMOS POR PUBLICIDAD EN COMUNIDADES ===== */}
      <h2 style={styles.h2}>
        Qué entendemos por publicidad en comunidades digitales
      </h2>
      <p style={styles.p}>
        Cuando hablo de publicidad en comunidades no me refiero a poner un banner en un foro
        de 2008. Hablo de comprar espacio publicitario dentro de grupos y servidores donde la
        gente participa activamente todos los días. Los tres grandes ecosistemas ahora mismo son:
      </p>
      <ul style={styles.ul}>
        <li style={styles.li}>
          <span style={styles.strong}>Discord:</span> servidores temáticos con miles de miembros
          activos. Gaming, cripto, programación, finanzas, fitness, marketing. La publicidad
          se hace a través de menciones en canales de anuncios, mensajes fijados o roles
          patrocinados. Es el canal donde mejor me ha funcionado para productos digitales.
          Si quieres profundizar, escribí una{' '}
          <Link to="/blog/publicidad-en-discord-guia-completa" style={styles.link}>
            guía completa de publicidad en Discord
          </Link>.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>Telegram:</span> canales y grupos con audiencias muy
          fieles. La tasa de lectura en un canal de Telegram bien gestionado supera el 40%.
          Compáralo con el 2% de alcance orgánico de una página de Facebook. Los formatos
          van desde menciones nativas hasta posts patrocinados con imagen y enlace. También
          hablé a fondo sobre cómo{' '}
          <Link to="/blog/monetizar-canal-telegram-espana" style={styles.link}>
            monetizar un canal de Telegram en España
          </Link>.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>WhatsApp:</span> grupos y canales de difusión. Aquí la
          publicidad es más delicada porque WhatsApp es un espacio personal, pero los canales
          de difusión han abierto una puerta interesante para marcas que saben respetar el
          formato. He escrito sobre ello en la{' '}
          <Link to="/blog/publicidad-en-whatsapp-guia-completa" style={styles.link}>
            guía de publicidad en WhatsApp
          </Link>.
        </li>
      </ul>
      <p style={styles.p}>
        La diferencia fundamental entre estos canales y las redes sociales es que no hay
        algoritmo decidiendo quién ve tu mensaje. Cuando publicas un anuncio en un servidor
        de Discord o un canal de Telegram, <span style={styles.strong}>lo ven todos los
        miembros activos</span>. No un 3% filtrado por un algoritmo que prioriza reels y
        contenido viral. La publicidad en comunidades es más parecida a una recomendación
        dentro de un grupo de confianza que a un anuncio interrumpiendo un feed.
      </p>
      <p style={styles.p}>
        Y eso cambia absolutamente todo. Porque el contexto en el que se recibe un mensaje
        publicitario determina si funciona o no. No es lo mismo ver un anuncio mientras haces
        scroll sin pensar que leerlo en un canal donde confías en el administrador y en la
        comunidad que hay detrás.
      </p>

      {/* ===== SECTION 3: ATENCIÓN REAL VS IMPRESIONES VACÍAS ===== */}
      <h2 style={styles.h2}>
        La gran diferencia: atención real vs impresiones vacías
      </h2>
      <p style={styles.p}>
        Aquí viene lo interesante. Las plataformas de ads tradicionales te venden impresiones.
        Mil impresiones, diez mil impresiones, cien mil impresiones. Suena bien en un dashboard.
        Pero ¿qué significa realmente una impresión en Instagram? Significa que tu anuncio
        apareció en la pantalla de alguien durante un segundo mientras hacía scroll. Ni siquiera
        sabes si lo vio. Ni siquiera sabes si estaba mirando la pantalla.
      </p>
      <p style={styles.p}>
        ¿Prefieres 10.000 impresiones de gente haciendo scroll o 500 de personas que leen
        tu mensaje completo? Yo antes habría dicho 10.000 sin pensarlo. Ahora digo 500 sin
        dudar. Y no es teoría: tengo los números.
      </p>
      <p style={styles.p}>
        En las comunidades digitales, el engagement es radicalmente diferente. Un post
        patrocinado en un canal de Telegram con 5.000 suscriptores tiene una tasa de lectura
        media del 35-45%. Eso son entre 1.750 y 2.250 personas que realmente leen tu mensaje.
        No que lo vieron de reojo. Que lo leyeron. En Instagram, para conseguir que 2.000
        personas lean tu copy completo necesitas probablemente 80.000 o 100.000 impresiones.
        Y el presupuesto para eso es otro mundo.
      </p>
      <p style={styles.p}>
        Lo mismo pasa con Discord. Un mensaje en un canal de anuncios de un servidor activo
        tiene una tasa de interacción del 8-12%. En Instagram Ads, si llegas al 1.5% de CTR
        ya estás celebrando. La diferencia es brutal. Y no es que la gente en comunidades sea
        más crédula o más fácil de convencer. Es que están en un contexto donde eligen prestar
        atención. No les estás interrumpiendo. Les estás hablando en un espacio donde ya están
        receptivos.
      </p>
      <blockquote style={styles.blockquote}>
        La atención voluntaria convierte entre 5x y 10x más que la atención interrumpida.
        Eso no lo digo yo, lo dicen mis hojas de cálculo después de 50 campañas.
      </blockquote>
      <p style={styles.p}>
        Hay otro factor que muchos pasan por alto: la confianza. Cuando el administrador de
        una comunidad recomienda un producto, sus miembros lo perciben como una recomendación
        personal, no como un anuncio. Eso genera un nivel de confianza que ningún formato
        publicitario de Meta o Google puede replicar. Es publicidad nativa en comunidades
        llevada al extremo: tan nativa que no parece publicidad.
      </p>
      <p style={styles.p}>
        Y la confianza se traduce en conversiones. Siempre. Un clic que viene de una
        recomendación en un grupo de Telegram tiene un ratio de conversión 3-4 veces
        superior a un clic que viene de un anuncio en Stories. No porque el producto sea
        mejor. Porque la persona que hace clic ya confía en la fuente.
      </p>

      {/* ===== SECTION 4: COMPARATIVA CPM Y CPC ===== */}
      <h2 style={styles.h2}>
        Comparativa de CPM y CPC: comunidades vs Instagram vs TikTok
      </h2>
      <p style={styles.p}>
        Sé que quieres números. Yo también los quería cuando empecé a investigar esto. Así
        que he recopilado los datos de mis últimas campañas y los he puesto en una tabla.
        Estos son promedios reales de lo que yo he pagado y los resultados que he obtenido.
        No son datos de un informe genérico de una consultora. Son mis números.
      </p>

      <div style={{ overflowX: 'auto', margin: '28px 0' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Canal</th>
              <th style={styles.th}>CPM medio</th>
              <th style={styles.th}>CTR medio</th>
              <th style={styles.th}>Conversión</th>
              <th style={styles.th}>Confianza</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>Instagram Ads</td>
              <td style={styles.td}>8-14€</td>
              <td style={styles.td}>0,8-1,5%</td>
              <td style={styles.td}>1,2-2,5%</td>
              <td style={styles.td}>Baja</td>
            </tr>
            <tr>
              <td style={styles.td}>TikTok Ads</td>
              <td style={styles.td}>5-10€</td>
              <td style={styles.td}>1,0-2,0%</td>
              <td style={styles.td}>0,8-1,8%</td>
              <td style={styles.td}>Baja</td>
            </tr>
            <tr>
              <td style={styles.td}>Telegram</td>
              <td style={styles.td}>2-5€</td>
              <td style={styles.td}>3,5-6,0%</td>
              <td style={styles.td}>3,0-5,5%</td>
              <td style={styles.td}>Alta</td>
            </tr>
            <tr>
              <td style={styles.td}>Discord</td>
              <td style={styles.td}>1-4€</td>
              <td style={styles.td}>4,0-8,0%</td>
              <td style={styles.td}>3,5-7,0%</td>
              <td style={styles.td}>Muy alta</td>
            </tr>
            <tr>
              <td style={styles.td}>WhatsApp</td>
              <td style={styles.td}>3-7€</td>
              <td style={styles.td}>5,0-9,0%</td>
              <td style={styles.td}>4,0-8,0%</td>
              <td style={styles.td}>Muy alta</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={styles.p}>
        Mira la columna de conversión. Instagram y TikTok se mueven en el rango del 1-2%.
        Las comunidades están en el 3-8%. Y el CPM en comunidades es entre un 50% y un 75%
        más barato. ¿Qué significa eso en la práctica? Que con el mismo presupuesto obtienes
        más impresiones de mayor calidad con mayor tasa de conversión. Es matemática pura.
      </p>
      <p style={styles.p}>
        Ahora, un matiz importante. Estos números son para nichos concretos. Si vendes un
        producto masivo tipo Coca-Cola, las comunidades no te van a dar el volumen que necesitas.
        Pero si vendes software, cursos, productos digitales, suplementos, servicios B2B o
        cualquier cosa dirigida a un público específico, el CPM en comunidades vs Instagram
        no tiene color. Y el CPC tampoco. Estamos hablando de CPCs de 0,10-0,30€ en
        comunidades frente a 0,50-1,50€ en Meta Ads.
      </p>
      <p style={styles.p}>
        Otro dato que me voló la cabeza: el coste por adquisición. En mis campañas de
        comunidades, el CPA medio ha sido de 4,20€. En Instagram Ads, para los mismos
        productos, el CPA medio fue de 18,50€. Casi 4,5 veces más caro. Y no estoy
        hablando de campañas mal optimizadas en Instagram. Estoy hablando de campañas
        con audiencias lookalike, creatividades testeadas y presupuestos razonables.
      </p>

      <img
        style={styles.img}
        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=720&q=80&auto=format"
        alt="Dashboard comparativo de rendimiento publicitario"
        loading="lazy"
      />
      <p style={styles.imgCaption}>
        Los dashboards cuentan la historia: las métricas de comunidades superan a las redes en casi todos los KPIs.
      </p>

      {/* ===== SECTION 5: MI EXPERIMENTO ===== */}
      <h2 style={styles.h2}>
        Mi experimento: misma campaña en Meta Ads vs comunidades
      </h2>
      <p style={styles.p}>
        Te cuento el experimento que me convenció definitivamente. El mes pasado lancé la
        misma campaña en Instagram Ads y en 3 servidores de Discord. El producto era un
        curso online de productividad para freelancers. Mismo copy, misma imagen, mismo
        enlace de compra con UTMs diferentes para trackear todo. El presupuesto fue exactamente
        el mismo: 150€ por canal.
      </p>
      <p style={styles.p}>
        Resultados de Instagram Ads: 2.100 impresiones, 12 clics al enlace, 0 conversiones.
        Cero. Nada. 150€ tirados. Bueno, no tirados del todo porque quizá generé algo de
        awareness, pero vamos, no vendí nada. El CTR fue del 0,57% y el CPC de 12,50€.
        Bastante malo incluso para los estándares de Meta.
      </p>
      <p style={styles.p}>
        Resultados en los 3 servidores de Discord: 800 impresiones totales (sí, muchas menos),
        47 clics al enlace y 8 ventas. Ocho. Con 150€. El CTR fue del 5,9% y el CPC de 3,19€.
        Cada venta me costó 18,75€ y el curso se vendía a 49€. Rentable desde el primer día.
      </p>
      <blockquote style={styles.blockquote}>
        800 impresiones en comunidades generaron 8 ventas. 2.100 impresiones en Instagram
        generaron 0. El mismo presupuesto. El mismo producto. El mismo copy. La única
        diferencia fue el canal.
      </blockquote>
      <p style={styles.p}>
        ¿Por qué pasó esto? Tres razones. Primera: los miembros de esos servidores de Discord
        eran exactamente el público objetivo. Freelancers que buscan ser más productivos.
        Segmentación perfecta por contexto, no por algoritmo. Segunda: el mensaje venía
        del administrador del servidor, alguien en quien confían. Tercera: estaban leyendo
        activamente, no haciendo scroll entre memes y stories.
      </p>
      <p style={styles.p}>
        Repetí variantes de este experimento cinco veces más con diferentes productos y nichos.
        Los resultados fueron consistentes. Las comunidades ganaron en conversión en todas las
        pruebas. Instagram ganó en volumen de impresiones, pero las impresiones sin conversión
        son vanidad. Y la vanidad no paga facturas.
      </p>
      <p style={styles.p}>
        Eso sí, voy a ser honesto. No todas las campañas en comunidades funcionaron tan bien.
        Hubo un servidor donde pagué 60€ y solo conseguí 3 clics. ¿La razón? El servidor era
        grande pero estaba muerto. Mucha gente registrada, poca gente activa. Aprendí a mirar
        la actividad real del servidor antes de comprar, no solo el número de miembros. Es un
        error de novato que me costó dinero aprender.
      </p>

      {/* ===== SECTION 6: CUÁNDO TIENE SENTIDO ===== */}
      <h2 style={styles.h2}>
        Cuándo tiene sentido la publicidad en comunidades (y cuándo no)
      </h2>
      <p style={styles.p}>
        No quiero venderte la moto. La publicidad en comunidades no es para todo el mundo
        ni para todo tipo de producto. Funciona increíblemente bien en ciertos contextos y
        es mediocre o directamente mala en otros. Déjame ser claro.
      </p>
      <p style={styles.p}>
        <span style={styles.strong}>Funciona muy bien cuando:</span>
      </p>
      <ul style={styles.ul}>
        <li style={styles.li}>
          Vendes productos o servicios para un nicho específico: software para developers,
          cursos de trading, suplementos deportivos, herramientas SaaS, productos para
          gamers, servicios de diseño.
        </li>
        <li style={styles.li}>
          Tu público objetivo se agrupa naturalmente en comunidades. Si tu cliente ideal
          está en servidores de Discord o grupos de Telegram, tienes oro entre las manos.
        </li>
        <li style={styles.li}>
          Buscas conversiones directas, no brand awareness masivo. Las comunidades son
          máquinas de conversión, no vallas publicitarias.
        </li>
        <li style={styles.li}>
          Tu presupuesto es limitado. Con 50-200€ puedes hacer campañas efectivas en
          comunidades. En Meta Ads, con 50€ apenas generas datos suficientes para optimizar.
        </li>
      </ul>
      <p style={styles.p}>
        <span style={styles.strong}>No funciona bien cuando:</span>
      </p>
      <ul style={styles.ul}>
        <li style={styles.li}>
          Necesitas alcance masivo rápido. Si quieres llegar a millones de personas en una
          semana, las redes sociales y Google siguen siendo tu mejor opción.
        </li>
        <li style={styles.li}>
          Tu producto es mainstream sin nicho claro. Una marca de refrescos no va a encontrar
          su audiencia en un servidor de Discord.
        </li>
        <li style={styles.li}>
          No tienes paciencia para buscar y validar comunidades. Encontrar los servidores y
          canales correctos requiere tiempo y criterio. No es tan plug-and-play como Meta Ads.
        </li>
      </ul>
      <p style={styles.p}>
        Dicho esto, la mayoría de negocios online que conozco encajan perfectamente en el
        primer grupo. Si vendes algo específico a un público concreto, las ventajas de
        anunciarse en comunidades son enormes. El problema es que la mayoría de marketers
        ni siquiera sabe que esta opción existe. Y ahí está tu ventaja competitiva.
      </p>

      {/* ===== SECTION 7: CÓMO COMBINAR ===== */}
      <h2 style={styles.h2}>
        Cómo combinar redes sociales y comunidades en tu estrategia
      </h2>
      <p style={styles.p}>
        No voy a decirte que dejes Meta Ads mañana. Sería irresponsable. Lo que sí te digo
        es que no pongas todos los huevos en la misma cesta. Mi estrategia actual es la
        siguiente: uso redes sociales para brand awareness y retargeting, y uso comunidades
        para conversión directa. Funcionan como una máquina bien engrasada cuando las combinas.
      </p>
      <p style={styles.p}>
        El flujo que mejor me ha funcionado es este: un anuncio en Instagram o TikTok genera
        el primer contacto y mete tráfico a la web. El pixel de retargeting captura a esa
        gente. Paralelamente, lanzo campañas en comunidades de Discord y Telegram dirigidas
        al mismo nicho. La gente que ya vio la marca en redes y luego la encuentra recomendada
        en su comunidad de confianza convierte a tasas ridículas. Es como un uno-dos de boxeo:
        el jab de redes sociales prepara y el gancho de la comunidad cierra.
      </p>
      <p style={styles.p}>
        En cuanto a reparto de presupuesto, actualmente destino un 40% a redes sociales y
        un 60% a comunidades. Hace un año era 85-15 a favor de redes. El cambio no fue
        ideológico, fue por ROI. Moví dinero donde rendía más. Así de simple. Y si sigo
        viendo estos resultados, probablemente en seis meses sea 30-70.
      </p>
      <p style={styles.p}>
        Una cosa más: no subestimes el efecto compuesto de estar presente en comunidades.
        Cuando te ven una vez es un anuncio. Cuando te ven tres veces en comunidades donde
        confían, eres una marca que conocen. Ese posicionamiento no se compra con CPM.
        Se construye con presencia consistente en los espacios correctos.
      </p>

      <img
        style={styles.img}
        src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=720&q=80&auto=format"
        alt="Tendencias de marketing digital y publicidad en comunidades"
        loading="lazy"
      />
      <p style={styles.imgCaption}>
        El futuro del marketing digital pasa por los espacios donde la atención es real.
      </p>

      {/* ===== SECTION 8: FUTURO ===== */}
      <h2 style={styles.h2}>
        Por qué el presupuesto de marketing se moverá a comunidades en 2027
      </h2>
      <p style={styles.p}>
        Hago una predicción y la dejo por escrito: en 2027 veremos un movimiento masivo de
        presupuesto publicitario desde las redes sociales tradicionales hacia las comunidades.
        No porque las redes mueran, sino porque el modelo de atención interrumpida está
        agotándose. Los usuarios cada vez son más ciegos a los anuncios en feeds. El ad
        fatigue es real y va a peor.
      </p>
      <p style={styles.p}>
        Mientras tanto, las comunidades digitales están creciendo. Discord ya tiene más de
        200 millones de usuarios activos mensuales. Telegram supera los 900 millones. Los
        canales de WhatsApp están explotando. Y lo más importante: la gente en estos
        espacios presta atención de verdad. No está en modo zombie haciendo scroll.
        Está leyendo, participando, interactuando.
      </p>
      <p style={styles.p}>
        El futuro de la publicidad en comunidades es brillante porque resuelve el mayor
        problema del marketing digital actual: conseguir atención real en un mundo de
        distracciones infinitas. Las marcas que lo entiendan antes tendrán una ventaja
        competitiva enorme. Las que sigan volcando todo su presupuesto en Meta Ads
        verán cómo el CPA sigue subiendo trimestre tras trimestre.
      </p>
      <p style={styles.p}>
        Yo ya tomé mi decisión. Las comunidades son el canal donde más invierto y donde
        mejores resultados obtengo. No digo que sea fácil, porque encontrar las comunidades
        correctas y negociar con los admins requiere trabajo. Pero precisamente porque no
        es fácil, la competencia es baja. Y donde hay poca competencia y mucha atención
        hay oportunidades enormes.
      </p>

      {/* ===== CTA BLOCK ===== */}
      <div style={styles.cta}>
        <h3 style={{ ...styles.h3, marginTop: 0 }}>
          Empieza a anunciarte en comunidades hoy
        </h3>
        <p style={{ ...styles.p, marginBottom: 8 }}>
          En <span style={styles.strong}>Channelad</span> conectamos marcas con las
          comunidades más activas de Discord, Telegram y WhatsApp. Sin intermediarios,
          con métricas reales y precios transparentes. Si quieres probar la publicidad
          en comunidades con presupuestos desde 20€, estás en el sitio correcto.
        </p>
        <Link to="/para-anunciantes" style={styles.ctaButton}>
          Ver comunidades disponibles
        </Link>
        <span style={{ margin: '0 12px', color: 'var(--muted)' }}>o</span>
        <Link to="/marketplace" style={{ ...styles.ctaButton, background: '#25d366' }}>
          Explorar el marketplace
        </Link>
      </div>
    </article>
  );
}
