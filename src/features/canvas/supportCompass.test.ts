import { describe, expect, it } from 'vitest';
import {
  computePolarReaction,
  polarAngleArcPath,
  reactiveTorquePath,
} from './supportCompass';

describe('supportCompass', () => {
  it('computes polar reaction for quadrant 1 (positive Rx, positive Ry)', () => {
    // 3, 4, 5 triangle: angle is ~53.13 deg
    const polar = computePolarReaction(30, 40, 0);
    expect(polar.rNet).toBeCloseTo(50);
    expect(polar.thetaDeg).toBeCloseTo(53.13, 1);
    expect(polar.hasForce).toBe(true);
    expect(polar.hasMoment).toBe(false);
    expect(polar.screenVector.ux).toBeCloseTo(0.6);
    expect(polar.screenVector.uy).toBeCloseTo(-0.8); // Screen Y is inverted
  });

  it('computes polar reaction for purely vertical reaction (Rx = 0, Ry = 100)', () => {
    const polar = computePolarReaction(0, 100, 0);
    expect(polar.rNet).toBeCloseTo(100);
    expect(polar.thetaDeg).toBeCloseTo(90);
    expect(polar.screenVector.ux).toBeCloseTo(0);
    expect(polar.screenVector.uy).toBeCloseTo(-1); // Points upward on screen
  });

  it('computes polar reaction for purely horizontal reaction (Rx = -50, Ry = 0)', () => {
    const polar = computePolarReaction(-50, 0, 0);
    expect(polar.rNet).toBeCloseTo(50);
    expect(polar.thetaDeg).toBeCloseTo(180);
    expect(polar.screenVector.ux).toBeCloseTo(-1);
    expect(polar.screenVector.uy).toBeCloseTo(0);
  });

  it('handles negative quadrant (Rx = -30, Ry = -40)', () => {
    const polar = computePolarReaction(-30, -40, 25);
    expect(polar.rNet).toBeCloseTo(50);
    expect(polar.thetaDeg).toBeCloseTo(233.13, 1);
    expect(polar.hasMoment).toBe(true);
    expect(polar.rm).toBe(25);
  });

  it('handles zero reaction gracefully', () => {
    const polar = computePolarReaction(0, 0, 0);
    expect(polar.rNet).toBe(0);
    expect(polar.hasForce).toBe(false);
    expect(polar.hasMoment).toBe(false);
  });

  it('generates valid polar angle arc path', () => {
    const path = polarAngleArcPath(100, 200, 25, Math.PI / 4);
    expect(path).toContain('M 125 200');
    expect(path).toContain('A 25 25');
  });

  it('generates reactive torque path for clockwise and counter-clockwise moments', () => {
    const ccw = reactiveTorquePath(50, 50, 20, 15);
    expect(ccw.path).toContain('A 20 20');

    const cw = reactiveTorquePath(50, 50, 20, -15);
    expect(cw.path).toContain('A 20 20');
  });
});
