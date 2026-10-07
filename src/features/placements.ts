/** The placements we test in M1 (brief section 5). The best one becomes the on-screen placement guide. */
export const PLACEMENTS = [
  { id: 'A', label: 'A · Flat, hand above screen', how: 'Phone flat on the table, screen up. Move your hand up and down above the screen.' },
  { id: 'B', label: 'B · Flat, hand at bottom edge', how: 'Phone flat on the table. Move your hand toward and away from the bottom edge (where the speaker is).' },
  { id: 'C', label: 'C · Upright, bottom edge to you', how: 'Phone standing upright on a stand, bottom edge pointing at you. Move your hand toward and away from it.' },
  { id: 'D', label: 'D · Other', how: 'Any other position that seems to work for this phone. Describe it in the chat.' },
] as const

export type PlacementId = (typeof PLACEMENTS)[number]['id']
