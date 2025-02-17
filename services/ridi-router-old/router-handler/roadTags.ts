export function getTagSection(tag: string) {
  if (
    [
      "motorway",
      "trunk",
      "primary",
      "secondary",
      "tertiary",
      "unclassified",
      "residential",
      "living_street",
      "track",
      "path",
    ].includes(tag)
  ) {
    return "highway";
  }
  if (
    [
      "paved",
      "asphalt",
      "chipseal",
      "concrete",
      "concrete:lanes",
      "concrete:plates",
      "paving_stones",
      "paving_stones:lanes",
      "grass_paver",
      "sett",
      "unhewn_cobblestone",
      "cobblestone",
      "bricks",
      "unpaved",
      "compacted",
      "fine_gravel",
      "gravel",
      "shells",
      "rock",
      "pebblestone",
      "ground",
      "dirt",
      "earth",
      "grass",
      "mud",
      "sand",
      "woodchips",
      "snow",
      "ice",
      "salt",
      "metal",
      "metal_grid",
      "wood",
      "stepping_stones",
      "rubber",
      "tiles",
    ].includes(tag)
  ) {
    return "surface";
  }
  if (
    [
      "excellent",
      "good",
      "intermediate",
      "bad",
      "very_bad",
      "horrible",
      "very_horrible",
      "impassable",
    ].includes(tag)
  ) {
    return "smoothness";
  }
  throw new Error("uknonw tag");
}
