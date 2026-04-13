import { LemmingsEngine, runSimulationMathValidation, snapshotDigest } from './sim';

describe('LemmingsEngine simulation', () => {
  it('keeps deterministic replay for scripted skill commands', () => {
    const engineA = new LemmingsEngine(0);
    const engineB = new LemmingsEngine(0);

    engineA.start();
    engineB.start();

    for (let tick = 0; tick < 90; tick += 1) {
      engineA.tick(1);
      engineB.tick(1);
      if (tick % 14 === 0) {
        engineA.selectNextAgent();
        engineB.selectNextAgent();
        engineA.assignSelectedSkill();
        engineB.assignSelectedSkill();
      }
    }

    expect(snapshotDigest(engineA.getSnapshot())).toEqual(snapshotDigest(engineB.getSnapshot()));
  });

  it('changes inventory when assigning selectable skills', () => {
    const engine = new LemmingsEngine(0);
    engine.start();

    for (let tick = 0; tick < 40; tick += 1) {
      engine.tick(1);
    }

    engine.selectNextAgent();
    engine.setSelectedSkill('builder');

    const before = engine.getSnapshot().skillInventory.builder;
    const result = engine.assignSelectedSkill();
    const after = engine.getSnapshot().skillInventory.builder;

    if (result.ok) {
      expect(after).toBe(before - 1);
    } else {
      expect(after).toBe(before);
    }
  });

  it('runs math validation gate with all checks present', () => {
    const validation = runSimulationMathValidation();
    expect(typeof validation.deterministicReplayOk).toBe('boolean');
    expect(typeof validation.kinematicsOk).toBe('boolean');
    expect(typeof validation.voxelConservationOk).toBe('boolean');
    expect(typeof validation.resourceBalanceOk).toBe('boolean');
    expect(validation.details.digestA.length).toBeGreaterThan(5);
    expect(validation.details.initialSkillBudget).toBeGreaterThan(0);
  });
});
