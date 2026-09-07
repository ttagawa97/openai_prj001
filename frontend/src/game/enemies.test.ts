import { describe, expect, it } from 'vitest';
import {
  availableEnemyArchetypes,
  enemyArchetypes,
  selectEnemyArchetype,
  validateEnemyArchetypes,
} from './enemies';

describe('enemy archetype catalog', () => {
  it('contains valid role-specific definitions', () => {
    expect(validateEnemyArchetypes()).toEqual([]);
    expect(Object.keys(enemyArchetypes)).toHaveLength(6);
  });

  it('unlocks advanced archetypes by stage', () => {
    expect(availableEnemyArchetypes(1, 'air')).toEqual(['air-scout']);
    expect(availableEnemyArchetypes(2, 'ground')).toEqual(['ground-tank', 'ground-flak']);
    expect(availableEnemyArchetypes(3, 'air')).toContain('air-gunship');
    expect(availableEnemyArchetypes(5, 'ground')).toContain('ground-turret');
  });

  it('selects archetypes deterministically', () => {
    expect(selectEnemyArchetype(2, 'air', 0)).toBe('air-scout');
    expect(selectEnemyArchetype(2, 'air', 1)).toBe('air-interceptor');
    expect(selectEnemyArchetype(2, 'air', 2)).toBe('air-scout');
  });
});
