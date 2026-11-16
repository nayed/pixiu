import { describe, expect, it } from "vitest";
import type { Mood, Stage } from "../pet/view";
import { BLINK_ROW, bodySprite, eggSprite, lostBodySprite, paint, sprite } from "./sprites";
import data from "./sprites.json";

const STAGES: Stage[] = ["baby", "child", "teen", "adult"];
const MOODS: Mood[] = ["happy", "eating", "hungry", "stuffed", "sulky"];

describe("sprites", () => {
  it("has well-formed drawings: full rows and a color for every character", () => {
    for (const [name, drawing] of Object.entries(data.sprites)) {
      expect(drawing.rows, name).toHaveLength(drawing.height);
      for (const row of drawing.rows) {
        expect(row, name).toHaveLength(drawing.width);
        for (const cell of row) {
          if (cell !== ".") expect(drawing.palette, `${name} "${cell}"`).toHaveProperty(cell);
        }
      }
    }
  });

  it("has a body for every stage and mood", () => {
    for (const stage of STAGES) {
      for (const mood of MOODS) expect(bodySprite(stage, mood), `${stage} ${mood}`).toBeDefined();
    }
    expect(bodySprite("baby", "sulky")).toBe(sprite("baby-body-happy"));
  });

  it("has an egg for every crack", () => {
    expect(eggSprite("none")).toBe(sprite("egg-new"));
    expect(eggSprite("small")).toBe(sprite("egg-warming"));
    expect(eggSprite("full")).toBe(sprite("egg-hatching"));
  });

  it("has open eyes on the blink row of every happy body", () => {
    for (const stage of STAGES) {
      const row = bodySprite(stage, "happy").rows[BLINK_ROW[stage]];
      expect(`${row?.slice(4, 6)}${row?.slice(10, 12)}`, stage).toBe("wewe");
    }
  });
});

describe("lostBodySprite", () => {
  it("uses the drawn gray child", () => {
    expect(lostBodySprite("child")).toBe(sprite("child-body-lost"));
  });

  it("makes the other stages gray, with no cheeks and a flat mouth", () => {
    const teen = lostBodySprite("teen");
    expect(teen.palette).toMatchObject({ y: "#c2c4cf", o: "#9a9dab", h: "#dcdde4", p: "#c2c4cf" });
    expect(teen.rows[9]).toBe("..kyyyyyyyyyyk..");
    expect(teen.rows[10]).toBe("..kyyyykkyyyyk..");
    // The happy drawing it was made from is untouched.
    expect(sprite("teen-body-happy").rows[9]).toBe("..kyyykyykyyyk..");
  });

  it("matches the drawn child when built the same way", () => {
    const built = sprite("child-body-happy").rows.map((row, y) =>
      y === 10 ? `${row.slice(0, 6)}y${row.slice(7, 9)}y${row.slice(10)}` : row,
    );
    expect(built.map((row) => row.replaceAll("p", "y"))).toEqual(sprite("child-body-lost").rows);
  });

  it("returns the same object each time, so it is drawn once", () => {
    expect(lostBodySprite("adult")).toBe(lostBodySprite("adult"));
  });
});

describe("paint", () => {
  it("fills one pixel per colored cell", () => {
    const calls: [string, number, number][] = [];
    const context = {
      fillStyle: "",
      fillRect(x: number, y: number) {
        calls.push([this.fillStyle, x, y]);
      },
    };
    paint(context, { width: 2, height: 2, rows: ["a.", ".b"], palette: { a: "#111", b: "#222" } });
    expect(calls).toEqual([
      ["#111", 0, 0],
      ["#222", 1, 1],
    ]);
  });
});
