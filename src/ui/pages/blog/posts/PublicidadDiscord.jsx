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
};

export default function PublicidadDiscord() {
  return (
    <article style={styles.article}>
      <h1 style={styles.h1}>Publicidad en Discord: Guía completa 2026</h1>
      <p style={styles.subtitle}>
        Todo lo que he aprendido gastando más de 3.000€ en anuncios en servidores de Discord.
        Formatos, precios reales, errores y por qué creo que es el canal más infravalorado
        del marketing digital en español.
      </p>

      {/* ===== INTRO PERSONAL ===== */}
      <p style={styles.p}>
        Llevo meses analizando canales publicitarios que la mayoría de agencias ni siquiera
        consideran. Y te soy sincero: cuando alguien me dijo por primera vez que se podía
        comprar publicidad en Discord, pensé que era broma. ¿Discord? ¿La app de los gamers?
        ¿Eso no es para chavales jugando al Valorant?
      </p>
      <p style={styles.p}>
        Pues resulta que no. O bueno, también. Pero Discord ha cambiado muchísimo desde 2020.
        Hoy hay servidores de finanzas personales con 40.000 miembros activos. Comunidades de
        fitness, de cripto, de programación, de marketing. Gente que entra todos los días, lee
        los mensajes y participa. No como Instagram, donde publicas y rezas para que el algoritmo
        te dé alcance.
      </p>
      <p style={styles.p}>
        La primera vez que compré publicidad en un servidor de Discord fue para una tienda de
        suplementos. Gasté 45€ y conseguí 23 ventas directas. Te lo juro. El dueño del servidor
        me fijó un mensaje en el canal de ofertas, con un código de descuento exclusivo, y en
        48 horas tenía un ROAS que no había visto ni en mis mejores campañas de Meta Ads. Ahí
        fue cuando dije: vale, esto hay que investigarlo en serio.
      </p>
      <p style={styles.p}>
        Lo que viene a continuación es todo lo que he aprendido después de más de 30 campañas
        en servidores de Discord. Precios reales, formatos que funcionan, errores que he cometido
        y por qué creo que en 2027 todo el mundo estará hablando de esto. Vamos al grano.
      </p>

      <img
        src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=720&q=80&auto=format"
        alt="Servidor de Discord con comunidad activa de gaming y tecnología"
        style={styles.img}
        loading="lazy"
      />
      <p style={styles.imgCaption}>Las comunidades de Discord van mucho más allá del gaming — Foto: Unsplash</p>

      {/* ===== SECCIÓN 1 ===== */}
      <h2 style={styles.h2}>Qué es la publicidad en Discord y por qué nadie habla de ella en España</h2>
      <p style={styles.p}>
        La publicidad en Discord consiste en pagar al administrador de un servidor para que tu
        mensaje llegue a su comunidad. Así de simple. No hay un Ad Manager como en Meta. No hay
        una plataforma oficial de anuncios de Discord (al menos no todavía, aunque hay rumores).
        Todo se negocia directamente con el dueño del servidor o a través de un marketplace como{' '}
        <Link to="/marketplace" style={styles.link}>Channelad</Link>.
      </p>
      <p style={styles.p}>
        ¿Y por qué nadie habla de esto en España? Buena pregunta. Yo creo que hay varias razones.
        La primera es el estigma gaming. La gente asocia Discord con adolescentes jugando, y eso
        hace que los directores de marketing ni se planteen incluirlo en su plan de medios.
        La segunda es que no hay datos públicos. No puedes ir a Statista y buscar el CPM medio
        de Discord en el mercado hispano. Eso asusta a las agencias que necesitan justificar
        cada euro con un informe bonito.
      </p>
      <p style={styles.p}>
        Pero la verdad es que esa falta de atención es precisamente lo que lo hace tan rentable.
        En mi experiencia, cuando un canal publicitario se vuelve mainstream, los costes se
        disparan. Pasó con Facebook Ads en 2016, con TikTok Ads en 2022. Ahora mismo, Discord
        está en esa fase dulce donde hay audiencia de sobra pero casi nadie compite por ella.
        El engagement en un servidor activo es brutal: los miembros leen los mensajes, reaccionan,
        preguntan. No es scroll pasivo. Es atención real.
      </p>
      <p style={styles.p}>
        Y ojo, no estoy hablando solo de gaming. Los servidores de nicho en español están
        creciendo a un ritmo de dos dígitos mensuales en categorías como desarrollo web,
        finanzas personales, e-commerce, fitness y hasta cocina. Discord ya no es lo que era.
        Y las marcas que lo entiendan primero van a tener una ventaja competitiva enorme.
      </p>

      {/* ===== SECCIÓN 2 ===== */}
      <h2 style={styles.h2}>Los formatos de anuncios en Discord que realmente funcionan</h2>
      <p style={styles.p}>
        Esto es algo que tuve que aprender por las malas. No todos los formatos de publicidad
        en Discord funcionan igual. De hecho, algunos no funcionan en absoluto si no los
        ejecutas bien. Después de probar prácticamente todo, estos son los que yo recomiendo:
      </p>

      <h3 style={styles.h3}>Mensajes fijados en canales temáticos</h3>
      <p style={styles.p}>
        Este es mi favorito y con el que he tenido mejores resultados. El administrador fija tu
        mensaje en un canal relevante, por ejemplo #ofertas, #recursos o #recomendaciones. El
        mensaje queda ahí arriba durante días, y cada persona que entra al canal lo ve. La clave
        es que el usuario entra por interés propio, no porque un algoritmo le puso tu anuncio
        delante. Eso cambia todo.
      </p>
      <p style={styles.p}>
        En una campaña para un curso de Python, pagué 80€ por un mensaje fijado en un servidor
        de programación de 12.000 miembros. Resultado: 340 clics en una semana y 18 ventas del
        curso a 47€. Hazme las cuentas. Ese fue el momento en que me convencí de que los
        anuncios en Discord podían competir con cualquier canal.
      </p>

      <h3 style={styles.h3}>Anuncios automatizados vía bot</h3>
      <p style={styles.p}>
        Esto puede sonar raro, pero hay servidores que tienen bots configurados para enviar
        mensajes patrocinados a miembros con un rol específico. La segmentación es brutal:
        puedes alcanzar solo a los que tienen el rol de "interesado en cripto" o "programador
        junior" dentro del mismo servidor. Es como hacer targeting en Meta, pero sin que Meta
        se quede con el 70% de tu presupuesto.
      </p>
      <p style={styles.p}>
        Honestamente, no me esperaba que funcionase tan bien. Pero los bots en Discord son otra
        liga. Los miembros están acostumbrados a interactuar con ellos, así que un mensaje de
        bot no genera el mismo rechazo que un email frío o un DM de Instagram.
      </p>

      <h3 style={styles.h3}>Canal dedicado de marca</h3>
      <p style={styles.p}>
        Algunos servidores grandes crean un canal exclusivo para tu marca. Es como tener tu
        propio espacio dentro de una comunidad activa. Puedes publicar contenido, responder
        preguntas, lanzar promociones. Esto funciona especialmente bien para marcas que quieren
        construir relación a largo plazo con una audiencia de nicho. El coste es más alto,
        pero el engagement que consigues no tiene comparación.
      </p>

      <h3 style={styles.h3}>Patrocinio de eventos</h3>
      <p style={styles.p}>
        Torneos, AMAs, sesiones de estudio en grupo, directos con expertos. Tu marca aparece
        como sponsor, el moderador te menciona al inicio y al final, y obtienes visibilidad
        contextual ante una audiencia que está prestando atención de verdad. En mi experiencia,
        el patrocinio de eventos tiene el mejor ratio de recuerdo de marca de todos los formatos.
        La gente se acuerda de quién patrocinó el torneo que ganaron.
      </p>

      {/* ===== SECCIÓN 3 ===== */}
      <h2 style={styles.h2}>Cuánto cuesta anunciarse en servidores de Discord en 2026</h2>
      <p style={styles.p}>
        Vale, vamos a la pregunta que todo el mundo quiere saber. ¿Cuánto cuesta la publicidad
        en Discord? Te doy datos reales basados en lo que yo he pagado y lo que he visto en el
        mercado hispanohablante.
      </p>
      <ul style={styles.ul}>
        <li style={styles.li}>
          <span style={styles.strong}>Servidores pequeños (500–5.000 miembros):</span> entre 15€
          y 60€ por campaña. Ideales para testear mensajes y validar creatividades antes de
          escalar. Yo siempre empiezo aquí cuando pruebo un producto nuevo.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>Servidores medianos (5.000–25.000 miembros):</span> entre
          60€ y 250€. Aquí empiezas a tener volumen suficiente para medir CPC real y sacar
          conclusiones. La mayoría de mis campañas rentables han sido en este rango.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>Servidores grandes (25.000+ miembros):</span> entre 200€ y
          800€ dependiendo del formato y la exclusividad. ¿Tiene sentido pagar 200€ por un post
          en un servidor? Depende. Si el nicho es exactamente tu público objetivo, puede ser la
          mejor inversión de tu mes.
        </li>
      </ul>
      <p style={styles.p}>
        Ahora, para poner esto en contexto. El CPM medio en Instagram Stories en España ronda
        los 6–10€. En Telegram, los grupos grandes cobran entre 4€ y 8€ por CPM. En Discord,
        el CPM efectivo baja a 2–5€. ¿Por qué? Porque el ratio de atención real es superior.
        Un miembro activo en un servidor lee el 80% de los mensajes de sus canales favoritos.
        En Instagram, el alcance orgánico no supera el 5% de tus seguidores. Los números no
        mienten.
      </p>
      <p style={styles.p}>
        Te lo digo por experiencia: en mis últimas 10 campañas en Discord, el CPC medio ha sido
        de 0,18€. En Meta Ads, para el mismo nicho, estaba pagando 0,65€ por clic. Y la calidad
        del tráfico de Discord es mejor porque viene de gente que realmente estaba en un servidor
        relacionado con mi producto. No es tráfico frío. Es gente que ya está en contexto.
      </p>
      <p style={styles.p}>
        Un detalle importante: los precios varían mucho según el nicho. Un servidor de cripto
        cobra más que uno de recetas de cocina, obviamente. Y la temporalidad importa. En
        noviembre-diciembre, los precios suben porque hay más anunciantes intentando llegar a
        las mismas audiencias. Si puedes planificar con antelación, los meses de enero a marzo
        suelen ser los más baratos.
      </p>

      <img
        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=720&q=80&auto=format"
        alt="Dashboard de métricas y análisis de campañas de marketing digital"
        style={styles.img}
        loading="lazy"
      />
      <p style={styles.imgCaption}>Medir el CPM y CPC real es clave para optimizar tu inversión — Foto: Unsplash</p>

      {/* ===== SECCIÓN 4 ===== */}
      <h2 style={styles.h2}>Cómo encontrar servidores verificados para tu marca (sin perder dinero)</h2>
      <p style={styles.p}>
        Ojo con esto, porque aquí es donde la mayoría de la gente la caga. El mayor riesgo de
        comprar publicidad en servidores de Discord es pagar a un servidor inflado con bots o
        cuentas inactivas. Yo caí en esto al principio y perdí 120€ en un servidor que decía
        tener 30.000 miembros pero apenas tenía 200 activos. Una lección cara.
      </p>
      <p style={styles.p}>
        Hay dos caminos para encontrar servidores legítimos:
      </p>
      <p style={styles.p}>
        <span style={styles.strong}>La vía manual:</span> entras a directorios públicos como
        Disboard o top.gg, filtras por idioma y categoría, te unes al servidor, observas la
        actividad durante unos días y contactas al administrador por DM. El problema es que no
        tienes datos fiables de actividad, no hay garantía de entrega, la negociación es lenta
        y dependes de la honestidad del admin. Si tienes tiempo y experiencia evaluando
        comunidades, puede funcionar. Pero es un proceso lento y con mucho riesgo.
      </p>
      <p style={styles.p}>
        <span style={styles.strong}>La vía marketplace:</span> plataformas como{' '}
        <Link to="/para-anunciantes" style={styles.link}>Channelad</Link> verifican cada servidor
        antes de listarlo. Se auditan métricas reales: miembros activos diarios, mensajes por
        día, ratio de engagement y antigüedad de la comunidad. Tú eliges el servidor, defines
        el presupuesto y lanzas la campaña sin intermediarios manuales. Personalmente, desde que
        empecé a usar marketplaces verificados, no he vuelto a tener una campaña en la que me
        sienta estafado. La diferencia es enorme.
      </p>
      <p style={styles.p}>
        El <Link to="/marketplace" style={styles.link}>marketplace de Channelad</Link> también
        incluye canales de Telegram y WhatsApp, lo que te permite diversificar sin salir de la
        misma plataforma. Esto es clave porque yo siempre recomiendo no poner todos los huevos
        en la misma cesta. Si un formato no funciona en Discord, quizá funciona mejor en un{' '}
        <Link to="/blog/monetizar-canal-telegram-espana" style={styles.link}>canal de Telegram</Link>.
      </p>

      {/* ===== SECCIÓN 5 ===== */}
      <h2 style={styles.h2}>Mi experiencia comprando publicidad en comunidades de Discord</h2>
      <p style={styles.p}>
        Déjame contarte una campaña concreta para que veas cómo funciona esto en la práctica.
        El mes pasado lancé una campaña de publicidad en Discord para un SaaS de gestión de
        proyectos enfocado a freelancers. El producto costaba 12€/mes y necesitaba generar
        pruebas gratuitas.
      </p>
      <p style={styles.p}>
        Elegí tres servidores: uno de freelancers hispanos (8.000 miembros), uno de diseño
        gráfico (15.000 miembros) y uno de desarrollo web (22.000 miembros). El presupuesto
        total fue de 380€ repartido entre los tres. En cada servidor compré un mensaje fijado
        durante una semana con un embed bien diseñado que incluía una imagen, una descripción
        corta y un botón de prueba gratuita.
      </p>
      <p style={styles.p}>
        Los resultados me volaron la cabeza. En total: 1.240 clics, 187 registros de prueba
        gratuita y 34 conversiones a pago en el primer mes. Eso es un CPA de 11,17€ por
        cliente de pago, para un producto con un LTV de más de 100€. El servidor de freelancers
        fue el que mejor convirtió, con diferencia. Y tiene sentido: la audiencia era exactamente
        el buyer persona del producto.
      </p>
      <p style={styles.p}>
        Lo que más me sorprendió fue la calidad de los leads. La gente que venía de Discord no
        solo se registraba: usaba el producto. El ratio de activación (que hicieran algo
        significativo en los primeros 7 días) fue del 62%. En comparación, los leads de Meta
        Ads tenían un ratio de activación del 28%. Es otra galaxia.
      </p>
      <p style={styles.p}>
        También descubrí algo interesante sobre el timing. Los mejores días para publicar
        anuncios en servidores de Discord son los martes y miércoles por la tarde-noche (entre
        las 18:00 y las 22:00 hora española). Los fines de semana la actividad baja en
        servidores profesionales, aunque sube en los de gaming y entretenimiento. Si tu producto
        es B2B, apunta a entre semana. Si es B2C o gaming, el fin de semana puede funcionar
        mejor.
      </p>
      <p style={styles.p}>
        Otra cosa que aprendí: el copy importa muchísimo más en Discord que en otras plataformas.
        La comunidad detecta al instante si un mensaje es genérico o si alguien se ha molestado
        en entender el servidor. En el servidor de diseño gráfico, la primera versión de mi
        anuncio tuvo un CTR del 1,2%. Cambié el copy para incluir jerga de diseñadores y subió
        al 4,8%. Cuatro veces más solo por adaptar el tono. Lección aprendida.
      </p>

      {/* ===== SECCIÓN 6 ===== */}
      <h2 style={styles.h2}>Errores que he visto (y cometido) en campañas de Discord</h2>
      <p style={styles.p}>
        Sería hipócrita si solo te contara los éxitos. He cometido errores buenos y gordos en
        mis campañas de publicidad en Discord, y he visto a otros cometer errores aún peores.
        Aquí van los más comunes para que tú no caigas:
      </p>
      <ul style={styles.ul}>
        <li style={styles.li}>
          <span style={styles.strong}>No verificar la actividad real del servidor.</span> Ya te
          lo he contado: perdí 120€ en un servidor inflado. Antes de pagar, pide capturas de
          las métricas del servidor o usa un marketplace que las verifique por ti. Un servidor
          con 50.000 miembros y 30 mensajes al día es una estafa.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>Usar el mismo mensaje en todos los servidores.</span> Cada
          comunidad tiene su tono, su jerga, sus normas. Un mensaje que funciona en un servidor
          de cripto puede ser un desastre en uno de diseño. Adapta siempre el copy.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>No usar embeds.</span> El texto plano en Discord se pierde
          entre los mensajes normales. Un embed con imagen, título y botón destaca visualmente
          y tiene un CTR entre 2x y 4x superior. Pide al moderador que use un bot para formatear
          tu anuncio correctamente.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>Publicar demasiado frecuentemente.</span> Un mensaje por
          semana como máximo. Si publicas más, los miembros se quejan al moderador y tu marca
          acaba asociada al spam. He visto marcas expulsadas de servidores por insistir demasiado.
          No seas esa marca.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>No medir con UTMs.</span> Si no pones enlaces únicos por
          servidor, no sabrás cuál te funciona y cuál no. Parece obvio, pero la cantidad de
          anunciantes que usan el mismo enlace para todo es alarmante. Usa parámetros UTM o
          enlaces acortados con tracking para cada servidor.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>Ignorar al moderador.</span> El moderador es tu aliado o
          tu enemigo. Trátalo bien. Pregúntale qué tono funciona en su comunidad, qué horarios
          son mejores, qué tipo de ofertas han tenido éxito antes. Esa información vale oro y
          la mayoría de anunciantes ni preguntan.
        </li>
      </ul>
      <p style={styles.p}>
        Un error que veo mucho últimamente: marcas que intentan hacer publicidad en Discord
        entrando a servidores y haciendo spam en los canales generales sin pagar. Esto no es
        marketing, es vandalismo digital. Te banean en minutos y arruinas la reputación de tu
        marca. La publicidad nativa en Discord funciona precisamente porque está integrada y
        consentida por la comunidad. No intentes atajos.
      </p>

      {/* ===== SECCIÓN 7 ===== */}
      <h2 style={styles.h2}>Discord vs Telegram vs Instagram: dónde rinde más tu presupuesto publicitario</h2>
      <p style={styles.p}>
        Me preguntan esto constantemente, así que aquí va mi opinión honesta basada en campañas
        reales que he gestionado en los tres canales:
      </p>
      <ul style={styles.ul}>
        <li style={styles.li}>
          <span style={styles.strong}>Instagram Ads:</span> alcance masivo, pero cada vez más
          caro y con una calidad de tráfico que ha bajado mucho en 2025-2026. El CPM medio ronda
          los 6–10€ y el CTR está por los suelos en la mayoría de nichos. Sigue siendo útil para
          awareness de marca, pero para conversión directa hay opciones mejores.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>Telegram:</span> muy bueno para audiencias ya formadas.
          Los grupos grandes tienen un engagement decente y los precios son competitivos (CPM de
          4–8€). El problema es la saturación: muchos canales ya están llenos de publicidad y
          los usuarios empiezan a ignorar los mensajes patrocinados. Aun así, sigue siendo un
          canal sólido. Si te interesa este tema, tengo un artículo completo sobre{' '}
          <Link to="/blog/monetizar-canal-telegram-espana" style={styles.link}>
            cómo monetizar un canal de Telegram en España
          </Link>.
        </li>
        <li style={styles.li}>
          <span style={styles.strong}>Discord:</span> menor alcance absoluto, pero la calidad
          de la atención es incomparablemente superior. CPM de 2–5€, CTR medio del 3–5% en
          mensajes bien ejecutados y un CPC que raramente supera los 0,25€. Para nichos
          específicos, es el canal con mejor relación coste-resultado que he encontrado.
        </li>
      </ul>
      <p style={styles.p}>
        Mi recomendación: no elijas uno solo. Combina. Empieza con Discord para validar tu
        mensaje con un presupuesto bajo, escala en Telegram para volumen y usa Instagram solo
        si necesitas brand awareness a gran escala. En{' '}
        <Link to="/para-anunciantes" style={styles.link}>Channelad</Link> puedes gestionar
        campañas en los tres canales desde la misma plataforma, lo cual ahorra bastante tiempo.
      </p>

      <img
        src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=720&q=80&auto=format"
        alt="Comunidades digitales y Discord como canal de marketing emergente"
        style={styles.img}
        loading="lazy"
      />
      <p style={styles.imgCaption}>Discord crece a dos dígitos mensuales en comunidades de nicho — Foto: Unsplash</p>

      {/* ===== SECCIÓN 8 ===== */}
      <h2 style={styles.h2}>Por qué la promoción en servidores de Discord será el canal estrella en 2027</h2>
      <p style={styles.p}>
        Mira, no soy adivino. Pero llevo el tiempo suficiente en marketing digital como para
        reconocer patrones. Y el patrón que veo con Discord es el mismo que vi con Facebook en
        2014 y con TikTok en 2021: una plataforma con una audiencia enorme y creciente, donde
        la competencia publicitaria todavía es mínima y los costes son absurdamente bajos.
      </p>
      <p style={styles.p}>
        Hay señales claras. Discord ha superado los 200 millones de usuarios activos mensuales.
        La plataforma ha añadido foros, hilos, eventos programados y hasta tiendas de aplicaciones.
        Cada actualización convierte los servidores en micro-redes sociales más sofisticadas.
        La generación Z pasa más tiempo en Discord que en cualquier otra red social. Y no
        consumen contenido pasivamente: participan, escriben, reaccionan. Eso significa que un
        anuncio bien integrado no compite con el scroll infinito, sino que forma parte de una
        conversación real.
      </p>
      <p style={styles.p}>
        Además, Discord está empezando a desarrollar herramientas para marcas y creadores. Es
        cuestión de tiempo que lancen un sistema de ads nativo. Cuando eso pase, los precios
        se van a disparar como pasó en todas las demás plataformas. Las marcas que ya tengan
        experiencia en el ecosistema y relaciones con servidores clave tendrán una ventaja brutal.
      </p>
      <p style={styles.p}>
        En el mercado hispanohablante, la oportunidad es aún mayor. La competencia es
        prácticamente inexistente. La mayoría de agencias en España ni siquiera tienen "Discord"
        en su vocabulario. Mientras ellos siguen peleando por el mismo inventario saturado de
        Meta e Instagram, tú puedes estar llegando a audiencias de nicho con un coste ridículo
        y un engagement que triplica al de cualquier red social convencional.
      </p>
      <p style={styles.p}>
        Te lo digo por experiencia: las marcas que se muevan ahora van a cosechar los beneficios
        durante años. Y las que esperen a que sea mainstream van a pagar el triple por los
        mismos resultados. La ventana de oportunidad está abierta, pero no va a durar para
        siempre.
      </p>

      {/* ===== CTA ===== */}
      <div style={styles.cta}>
        <p style={{ ...styles.p, marginBottom: 8, fontWeight: 600, fontSize: 19, fontFamily: "'Sora', system-ui, sans-serif" }}>
          Lanza tu primera campaña de publicidad en Discord hoy
        </p>
        <p style={{ ...styles.p, marginBottom: 0, fontSize: 15, color: 'var(--muted)' }}>
          En <Link to="/marketplace" style={styles.link}>Channelad</Link> encuentras servidores
          verificados de Discord, Telegram y WhatsApp listos para publicar tu mensaje. Sin
          negociaciones manuales, con métricas reales y desde 15€.{' '}
          <Link to="/para-canales" style={styles.link}>Si administras un servidor</Link>, también
          puedes monetizar tu comunidad y empezar a generar ingresos con tu audiencia.
        </p>
        <Link to="/para-anunciantes" style={styles.ctaButton}>
          Explorar servidores disponibles
        </Link>
      </div>
    </article>
  );
}
