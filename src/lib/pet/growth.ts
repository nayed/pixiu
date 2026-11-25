// Growing up. The pet earns XP from weekly usage, 1 XP per point the weekly percent rises, and
// ages up when it has earned enough. Each age costs more than the one before.

import { RULES } from "./config";

/** The XP a pet of this age needs to reach the next age: 50 for age 1, then 10 more each age. */
export function xpToGrow(age: number): number {
  return RULES.firstAgeXp + RULES.extraXpPerAge * age;
}

/** Spends XP on as many ages as it pays for. Returns the new age and the XP left over. */
export function grow(age: number, xp: number): { age: number; xp: number } {
  let next = { age, xp };
  while (next.xp >= xpToGrow(next.age)) {
    next = { age: next.age + 1, xp: next.xp - xpToGrow(next.age) };
  }
  return next;
}

export type Growth = {
  /** Whole XP earned toward the next age, never more than it costs. */
  xp: number;
  /** What the next age costs. */
  needed: number;
  nextAge: number;
};

/** How far a pet is toward its next age, for the popup and the overlay. */
export function growthOf(pet: { age: number; xp: number }): Growth {
  const needed = xpToGrow(pet.age);
  // A pet brought from an older version can hold more XP than its next age costs until its
  // next read pays for the birthday. Show it as full, not as "64 / 60".
  return { xp: Math.min(Math.floor(pet.xp), needed), needed, nextAge: pet.age + 1 };
}
