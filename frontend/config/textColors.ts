export type ColorEntry = {
  name: string
  light: string
  dark: string
  group: string
  isCustom?: boolean
}

export const TEXT_COLOR_PALETTE: ColorEntry[] = [
  // Reds
  { name: 'Crimson',      light: '#dc2626', dark: '#f87171', group: 'Red'    },
  { name: 'Rose',         light: '#e11d48', dark: '#fb7185', group: 'Red'    },
  { name: 'Scarlet',      light: '#b91c1c', dark: '#fca5a5', group: 'Red'    },

  // Blues
  { name: 'Royal Blue',   light: '#2563eb', dark: '#60a5fa', group: 'Blue'   },
  { name: 'Sky',          light: '#0284c7', dark: '#38bdf8', group: 'Blue'   },
  { name: 'Navy',         light: '#1e3a8a', dark: '#93c5fd', group: 'Blue'   },
  { name: 'Indigo',       light: '#4338ca', dark: '#a5b4fc', group: 'Blue'   },

  // Greens
  { name: 'Forest',       light: '#16a34a', dark: '#4ade80', group: 'Green'  },
  { name: 'Emerald',      light: '#059669', dark: '#34d399', group: 'Green'  },
  { name: 'Lime',         light: '#65a30d', dark: '#a3e635', group: 'Green'  },

  // Purples
  { name: 'Violet',       light: '#7c3aed', dark: '#a78bfa', group: 'Purple' },
  { name: 'Purple',       light: '#9333ea', dark: '#c084fc', group: 'Purple' },
  { name: 'Fuchsia',      light: '#a21caf', dark: '#e879f9', group: 'Purple' },

  // Warm
  { name: 'Orange',       light: '#ea580c', dark: '#fb923c', group: 'Warm'   },
  { name: 'Amber',        light: '#d97706', dark: '#fbbf24', group: 'Warm'   },
  { name: 'Gold',         light: '#b45309', dark: '#fcd34d', group: 'Warm'   },
  { name: 'Yellow',       light: '#ca8a04', dark: '#fde047', group: 'Warm'   },

  // Pinks
  { name: 'Pink',         light: '#db2777', dark: '#f472b6', group: 'Pink'   },
  { name: 'Hot Pink',     light: '#be185d', dark: '#f9a8d4', group: 'Pink'   },
  { name: 'Magenta',      light: '#c026d3', dark: '#e879f9', group: 'Pink'   },

  // Teals & Cyans
  { name: 'Teal',         light: '#0d9488', dark: '#2dd4bf', group: 'Teal'   },
  { name: 'Cyan',         light: '#0891b2', dark: '#22d3ee', group: 'Teal'   },
  { name: 'Aqua',         light: '#0e7490', dark: '#67e8f9', group: 'Teal'   },

  // Neutrals
  { name: 'Slate',        light: '#475569', dark: '#cbd5e1', group: 'Neutral'},
  { name: 'Gray',         light: '#4b5563', dark: '#d1d5db', group: 'Neutral'},
  { name: 'Stone',        light: '#57534e', dark: '#d6d3d1', group: 'Neutral'},
  { name: 'White',        light: '#f8fafc', dark: '#f8fafc', group: 'Neutral'},
  { name: 'Black',        light: '#111827', dark: '#111827', group: 'Neutral'},

  // Gaming / Neon
  { name: 'Neon Green',   light: '#15803d', dark: '#39ff14', group: 'Gaming' },
  { name: 'Neon Blue',    light: '#1d4ed8', dark: '#00f5ff', group: 'Gaming' },
  { name: 'Neon Pink',    light: '#be185d', dark: '#ff006e', group: 'Gaming' },
  { name: 'Neon Purple',  light: '#6d28d9', dark: '#bf00ff', group: 'Gaming' },
  { name: 'Neon Orange',  light: '#c2410c', dark: '#ff6d00', group: 'Gaming' },
  { name: 'Electric',     light: '#1e40af', dark: '#7df9ff', group: 'Gaming' },
]

export function getGroupedPalette() {
  return TEXT_COLOR_PALETTE.reduce((acc, color) => {
    if (!acc[color.group]) acc[color.group] = []
    acc[color.group].push(color)
    return acc
  }, {} as Record<string, ColorEntry[]>)
}
