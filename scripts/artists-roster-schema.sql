-- ============================================================
-- Roster de artistas del sello — contenido editable desde admin
-- Ejecutar a mano en el Supabase SQL Editor
-- ============================================================
-- Reemplaza el array hardcodeado `artists` de app/data/artists.ts como
-- fuente de verdad para el CONTENIDO de texto de cada artista (nombre,
-- género, bio, párrafos de perfil, claves). Las decisiones de diseño
-- (imágenes, clases, modo de perfil, color de acento) siguen viviendo en
-- código, en `artistAssets` (app/data/artists.ts), keyeadas por `slug`.
--
-- NOTA: esta tabla NO tiene relación con `scripts/artists-platform-schema.sql`
-- (sistema de aplicaciones de artistas a eventos, dominio de
-- app/eventos/artistas/**). Son dos dominios distintos.

CREATE TABLE IF NOT EXISTS artists (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text UNIQUE NOT NULL,
  name               text NOT NULL,
  genre              text NOT NULL,
  summary            text NOT NULL DEFAULT '',
  profile_paragraphs text[] NOT NULL DEFAULT '{}',
  profile_highlights text[] NOT NULL DEFAULT '{}',
  visible            boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- Sin políticas: solo el service role (server-side) puede leer o escribir.
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

INSERT INTO artists
  (slug, name, genre, summary, profile_paragraphs, profile_highlights, sort_order)
VALUES
  (
    'vanessa-garcia',
    'Vanessa García',
    'POP / POP ROCK',
    'Una artista salvadoreña con una identidad femenina fuerte, que combina instinto pop, actitud rock y una dirección visual muy marcada.',
    ARRAY[
      'Vanessa García es una artista salvadoreña con una identidad femenina fuerte, donde conviven el instinto pop, la actitud rock y una dirección visual claramente definida.',
      'Su propuesta se mueve entre presencia, sensibilidad y carácter, construyendo una narrativa artística que se sostiene tanto en la canción como en la imagen.',
      'Dentro de Sivar Music Entertainment, su perfil se entiende como una voz con personalidad propia, pensada para crecer desde una dirección creativa coherente y contemporánea.'
    ],
    ARRAY[
      'Identidad femenina fuerte',
      'Instinto pop con actitud rock',
      'Dirección visual muy marcada'
    ],
    0
  ),
  (
    'monica-sin-tilde',
    'monica sin tilde',
    'POP / URBAN POP',
    'Una voz introspectiva y contemporánea que construye canciones íntimas, con texturas alternativas y una identidad profundamente personal.',
    ARRAY[
      'monica sin tilde es una voz introspectiva y contemporánea que trabaja desde la intimidad, el detalle y una identidad profundamente personal.',
      'Sus canciones parten de emociones cercanas y se abren a texturas alternativas que le dan un tono actual, sensible y honesto.',
      'Dentro de Sivar Music Entertainment, su perfil se desarrolla desde una visión artística enfocada en construir un universo propio, delicado pero definido.'
    ],
    ARRAY[
      'Canciones íntimas',
      'Texturas alternativas',
      'Identidad profundamente personal'
    ],
    1
  ),
  (
    'javii-diego-calvo',
    'Javii y Diego Calvo',
    'PRODUCCIÓN / COMPOSICIÓN',
    'Un dúo creativo que desarrolla música desde la producción, la composición y una visión sonora propia dentro del universo de Sivar Music Entertainment.',
    ARRAY[
      'Javii y Diego Calvo conforman un perfil compartido centrado en la producción y la composición como punto de partida creativo.',
      'Su trabajo se desarrolla desde una visión sonora propia, donde las ideas toman forma a través de decisiones de estructura, atmósfera y dirección musical.',
      'Dentro de Sivar Music Entertainment, este dúo representa una búsqueda enfocada en crear música con identidad, criterio y una sensibilidad contemporánea.'
    ],
    ARRAY[
      'Producción y composición',
      'Visión sonora propia',
      'Búsqueda contemporánea con identidad'
    ],
    2
  )
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION update_artists_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_artists_updated_at ON artists;
CREATE TRIGGER trg_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_artists_updated_at();
