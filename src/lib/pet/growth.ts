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
