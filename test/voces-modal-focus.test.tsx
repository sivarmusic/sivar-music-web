import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Modal from "@/app/voces/components/admin/Modal";

// Mismo patrón que las páginas del admin: onClose es una arrow inline, con lo
// cual cambia de identidad en cada render del padre.
function Harness() {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Nuevo casting">
      <input aria-label="Nombre" value={text} onChange={(e) => setText(e.target.value)} />
    </Modal>
  );
}

describe("Modal — foco", () => {
  afterEach(cleanup);

  it("no le roba el foco al input mientras se escribe", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Nombre") as HTMLInputElement;

    input.focus();
    expect(document.activeElement).toBe(input);

    // Cada tecla = setState en el padre = re-render con un onClose nuevo.
    for (const value of ["R", "RA", "RAB", "RABI"]) {
      fireEvent.change(input, { target: { value } });
      expect(document.activeElement).toBe(input);
    }
    expect(input.value).toBe("RABI");
  });

  it("al abrir enfoca el botón de cerrar", () => {
    render(<Harness />);
    expect(document.activeElement).toBe(screen.getByLabelText("Cerrar"));
  });

  it("Escape cierra el modal", () => {
    render(<Harness />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
