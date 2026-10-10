import Link from 'next/link'
import { Icon } from '../components/icons'
import SiteHeader from '../components/site/SiteHeader'
import SiteFooter from '../components/site/SiteFooter'

export default function PrivacidadPage() {
  return (
    <div className="ev-surface">
      <SiteHeader />
      <main id="main" className="ev-container ev-container--narrow ev-page">
        <Link href="/eventos" className="ev-back-link" style={{ marginBottom: 'var(--ev-space-4)' }}>
          <Icon name="arrow-left" size="sm" />Volver a eventos
        </Link>
        <div className="ev-legal">
          <p className="ev-eyebrow">Sivar Music Eventos</p>
          <h1 className="ev-display ev-display--md" style={{ marginTop: 'var(--ev-space-2)' }}>Políticas de privacidad</h1>
          <p className="ev-subtle" style={{ marginTop: 'var(--ev-space-2)', marginBottom: 'var(--ev-space-6)' }}>Última actualización: julio de 2026</p>

        <p>
          Este documento describe cómo <strong>Sivar Music Group LLC</strong>, a través de su
          división de eventos <strong>Sivar Music Eventos</strong> ("Sivar Music", "nosotros"),
          recopila, usa, almacena y protege los datos personales de quienes usan esta plataforma
          (sivarmusic.com/eventos) para comprar entradas, crear una cuenta o registrarse como artista.
        </p>

        <h2 className="ev-title ev-title--sm">1. Qué datos recopilamos</h2>
        <p>Según cómo uses la plataforma, recopilamos:</p>
        <ul>
          <li><strong>Cuenta de usuario:</strong> nombre completo, correo electrónico y teléfono. Si iniciás sesión con Google, recibimos tu nombre, correo y foto de perfil según los permisos que autorizás en ese momento.</li>
          <li><strong>Compra de entradas:</strong> nombre, teléfono y correo asociados a la orden, cantidad de entradas, y el comprobante (imagen) de tu transferencia bancaria para verificar el pago.</li>
          <li><strong>Cuenta de artista:</strong> nombre artístico, género musical, biografía, enlaces a redes sociales y plataformas de streaming, foto de perfil, y las fotos que subís a tu galería.</li>
          <li><strong>Uso del sitio:</strong> idioma preferido (ES/EN) y visitas a las páginas públicas de eventos (IP y navegador) con fines de analítica agregada, sin identificarte individualmente.</li>
        </ul>
        <p>
          <strong>No recopilamos ni almacenamos datos de tarjetas de crédito o débito.</strong>{' '}
          El pago de las entradas se realiza por transferencia bancaria directa a la cuenta indicada en la plataforma;
          nosotros solo guardamos el comprobante que subís para confirmar que la transferencia se hizo.
        </p>

        <h2 className="ev-title ev-title--sm">2. Para qué usamos tus datos</h2>
        <p>Usamos tus datos personales únicamente para:</p>
        <ul>
          <li>Procesar y confirmar tu compra, generar tu entrada con código QR y verificar tu ingreso al evento.</li>
          <li>Administrar tu cuenta y, si aplica, tu perfil público de artista.</li>
          <li>Enviarte notificaciones relacionadas con tu orden, tu cuenta o los eventos que seguís.</li>
          <li>Revisar y aprobar solicitudes de artistas y los eventos informativos que publiquen.</li>
          <li>Mejorar la plataforma y prevenir fraude o uso indebido.</li>
        </ul>
        <p>No vendemos ni compartimos tus datos personales con terceros para fines de publicidad.</p>

        <h2 className="ev-title ev-title--sm">3. Marco legal aplicable</h2>
        <p>
          Como usuario en El Salvador, tus datos personales están protegidos por la{' '}
          <strong>Ley para la Protección de Datos Personales</strong> (Decreto Legislativo
          N.º 144, vigente desde el 24 de noviembre de 2024), cuya autoridad de aplicación es la Agencia de
          Ciberseguridad del Estado (ACE), y por el artículo 21-A de la{' '}
          <strong>Ley de Protección al Consumidor</strong> (reformada por Decreto N.º 405,
          Diario Oficial N.º 119, Tomo 443, del 24 de junio de 2024), que obliga a los proveedores de bienes y
          servicios a usar la información personal de forma confidencial y a no difundirla a terceros sin tu
          autorización expresa, salvo requerimiento de autoridad competente.
        </p>

        <h2 className="ev-title ev-title--sm">4. Tus derechos</h2>
        <p>
          Como titular de tus datos, tenés derecho a acceder, rectificar, cancelar y oponerte al uso de tu información
          personal (derechos ARCO), así como a solicitar su eliminación de nuestros registros, salvo que exista una
          obligación legal de conservarla (por ejemplo, historial de una orden ya procesada). Podés ejercer estos
          derechos escribiendo a{' '}
          <a href="mailto:admin@sivarmusic.com">admin@sivarmusic.com</a>.
        </p>

        <h2 className="ev-title ev-title--sm">5. Venta y organización de eventos</h2>
        <p>
          Las entradas para los eventos publicados en esta plataforma son vendidas y administradas directamente por{' '}
          <strong>Sivar Music Eventos</strong>, división de{' '}
          <strong>Sivar Music Group LLC</strong>. Para los eventos informativos publicados
          por artistas a través de "Sivar Events for Artists", el artista es el único responsable de la información
          de su evento (fecha, lugar, precio de referencia); Sivar Music no vende ni administra entradas para esos
          eventos.
        </p>

        <h2 className="ev-title ev-title--sm">6. Cookies y almacenamiento local</h2>
        <p>
          Usamos cookies y almacenamiento local del navegador estrictamente necesarios para el funcionamiento del
          sitio: mantener tu sesión iniciada, recordar tu idioma preferido y, si sos administrador, mantener tu
          sesión de administración. No usamos cookies de publicidad ni de rastreo de terceros.
        </p>

        <h2 className="ev-title ev-title--sm">7. Seguridad</h2>
        <p>
          Tus datos se almacenan en infraestructura con acceso restringido y cifrado en tránsito. El acceso a
          información de órdenes, comprobantes y perfiles está limitado al personal administrativo de Sivar Music
          que lo necesita para operar la plataforma.
        </p>

        <h2 className="ev-title ev-title--sm">8. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios en la plataforma o en la normativa aplicable.
          La fecha de la última actualización figura al inicio de este documento.
        </p>

        <h2 className="ev-title ev-title--sm">9. Contacto</h2>
        <p>
          Para consultas sobre esta política o sobre tus datos personales, escribinos a{' '}
          <a href="mailto:admin@sivarmusic.com">admin@sivarmusic.com</a>.
        </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
