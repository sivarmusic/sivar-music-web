// Auditoría best-effort: nunca debe romper la operación principal.
// Si la columna todavía no existe (SQL sin correr) solo se registra en consola.
type Db = { from: (table: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export async function recordAudit(
  db: Db,
  table: string,
  id: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  try {
    const { error } = await db.from(table).update(fields).eq('id', id)
    if (error) {
      console.error('[audit] no se pudo registrar la auditoría', { table, id, message: error.message })
      return false
    }
    return true
  } catch (err) {
    console.error('[audit] excepción al registrar la auditoría', {
      table, id, message: err instanceof Error ? err.message : 'desconocido',
    })
    return false
  }
}
