// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { standardSections } from '../../data/standardSections';
import { ProjectProvider } from '../../store/ProjectContext';
import { SectionViewer2D } from './SectionViewer2D';

afterEach(cleanup);

const ipe300 = standardSections.find((section) => section.id === 'ipe-300')!;
const hss = standardSections.find((section) => section.shapeType === 'HSS_RECT')!;

const renderViewer = (section: { area: number; inertiaX: number }, stress = true) => render(
  <ProjectProvider>
    <SectionViewer2D
      area={section.area}
      inertia={section.inertiaX}
      units="kN-m"
      axialForce={stress ? -180 : 0}
      bendingMoment={stress ? 95 : 0}
    />
  </ProjectProvider>,
);

const shapeElement = () => document.querySelector('.section-shape');

describe('SectionViewer2D', () => {
  it('keeps the real profile geometry when the stress map is switched on', async () => {
    const user = userEvent.setup();
    renderViewer(ipe300);

    // Cotas: el perfil I es un `path`, no una caja.
    const dimensioned = shapeElement()!;
    expect(dimensioned.tagName.toLowerCase()).toBe('path');
    const outline = dimensioned.getAttribute('d')!;
    expect(outline).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Tensiones/ }));

    // La regresión concreta: el modo Stress pintaba un rectángulo con degradado
    // sobre cualquier perfil. El contorno tiene que seguir siendo el mismo path.
    const stressed = shapeElement()!;
    expect(stressed.tagName.toLowerCase()).toBe('path');
    expect(stressed.getAttribute('d')).toBe(outline);
  });

  it('clips the stress gradient with that same geometry instead of a bare rectangle', async () => {
    const user = userEvent.setup();
    renderViewer(ipe300);
    const outline = shapeElement()!.getAttribute('d');

    await user.click(screen.getByRole('button', { name: /Tensiones/ }));

    const fill = screen.getByTestId('section-stress-fill');
    expect(fill.getAttribute('mask')).toBe('url(#section-stress-mask)');
    expect(fill.getAttribute('fill')).toBe('url(#section-stress-gradient)');

    const masked = screen.getByTestId('section-stress-mask').querySelector('path');
    expect(masked?.getAttribute('d')).toBe(outline);
  });

  it('carries the hollow of a tube into the mask so the void stays empty', async () => {
    const user = userEvent.setup();
    renderViewer(hss);
    await user.click(screen.getByRole('button', { name: /Tensiones/ }));

    const mask = screen.getByTestId('section-stress-mask');
    const shapes = [...mask.querySelectorAll('rect')];
    expect(shapes).toHaveLength(2);
    // Blanco es material, negro es hueco.
    expect(shapes[0].getAttribute('fill')).toBe('white');
    expect(shapes[1].getAttribute('fill')).toBe('black');
  });

  it('places the zero-stress fibre where Navier puts it, not at mid depth', async () => {
    const user = userEvent.setup();
    renderViewer(ipe300);
    await user.click(screen.getByRole('button', { name: /Tensiones/ }));

    const stops = [...document.querySelectorAll('#section-stress-gradient stop')];
    // Con axil de compresión y flexión, σ cambia de signo dentro del canto: hay
    // una parada intermedia, y no está en el 50 % como estaba antes fijada.
    expect(stops).toHaveLength(3);
    const middle = Number(stops[1].getAttribute('offset'));
    expect(middle).toBeGreaterThan(0);
    expect(middle).toBeLessThan(1);
    expect(middle).not.toBeCloseTo(0.5, 3);
    expect(stops[1].getAttribute('stop-opacity')).toBe('0');
  });

  it('leaves the stress mode unavailable when the member carries no forces', () => {
    renderViewer(ipe300, false);
    expect((screen.getByRole('button', { name: /Tensiones/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
