import React from 'react';
import { Composition } from 'remotion';
import './lib/fonts';
import { Manifiesto, MANIFIESTO_DURACION } from './compositions/Manifiesto';
import { Analisis2D, ANALISIS_DURACION } from './compositions/Analisis2D';
import { Aula, AULA_DURACION } from './compositions/Aula';
import { Space3D, SPACE3D_DURACION } from './compositions/Space3D';

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    {/* Pieza principal, 16:9: qué es structureCo y de qué está hecho. */}
    <Composition
      id="Manifiesto"
      component={Manifiesto}
      durationInFrames={MANIFIESTO_DURACION}
      fps={FPS}
      width={1920}
      height={1080}
    />

    {/* Vertical 9:16 para redes: el flujo modelar → cargar → resolver → leer. */}
    <Composition
      id="Analisis2D"
      component={Analisis2D}
      durationInFrames={ANALISIS_DURACION}
      fps={FPS}
      width={1080}
      height={1920}
    />

    {/* Vertical 4:5: el modo Aula y su regla, «predice antes de calcular». */}
    <Composition
      id="Aula"
      component={Aula}
      durationInFrames={AULA_DURACION}
      fps={FPS}
      width={1080}
      height={1350}
    />

    {/* 16:9 en Noche: Space 3D con sus límites declarados en pantalla. */}
    <Composition
      id="Space3D"
      component={Space3D}
      durationInFrames={SPACE3D_DURACION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
