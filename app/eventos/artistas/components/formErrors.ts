// Reglas nativas del formulario (required, type=email/url...) leídas con la API de
// validación del navegador; solo cambia cómo se muestran los errores (por campo).
export type InvalidField = { id: string; missing: boolean; element: HTMLElement }

export function collectInvalid(form: HTMLFormElement): InvalidField[] {
  const out: InvalidField[] = []
  for (const el of Array.from(form.elements)) {
    const f = el as HTMLInputElement
    if (!f.id || typeof f.checkValidity !== 'function' || f.willValidate === false) continue
    if (!f.checkValidity()) out.push({ id: f.id, missing: f.validity?.valueMissing ?? true, element: f })
  }
  return out
}
