// Preset, fully-mock assets for the custom in-app attachment picker.
// Photos are generated as inline SVG-gradient data URLs so they render
// everywhere a real image would (picker grid, input preview, message bubble).

export interface SamplePhoto {
  id: string
  name: string
  size: number
  previewUrl: string
}

export interface SampleFile {
  id: string
  name: string
  ext: string
  size: number
}

function svgPhoto(stops: string[]): string {
  const grad = stops
    .map((c, i) => `<stop offset="${Math.round((i / (stops.length - 1)) * 100)}%" stop-color="${c}"/>`)
    .join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${grad}</linearGradient></defs>` +
    `<rect width="240" height="240" fill="url(#g)"/>` +
    `<circle cx="178" cy="64" r="44" fill="rgba(255,255,255,0.20)"/>` +
    `<circle cx="56" cy="186" r="74" fill="rgba(255,255,255,0.10)"/>` +
    `<circle cx="120" cy="120" r="20" fill="rgba(255,255,255,0.14)"/>` +
    `</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  { id: 'p1', name: 'IMG_2048.jpg', size: 2_310_000, previewUrl: svgPhoto(['#5B7CFA', '#8A6AF0', '#C76AE0']) },
  { id: 'p2', name: 'IMG_2049.jpg', size: 1_870_000, previewUrl: svgPhoto(['#C76AE0', '#FF9F5A']) },
  { id: 'p3', name: 'IMG_2050.jpg', size: 3_120_000, previewUrl: svgPhoto(['#34C759', '#4FC3F7']) },
  { id: 'p4', name: 'IMG_2051.jpg', size: 980_000, previewUrl: svgPhoto(['#6D6AF0', '#B96AE8']) },
  { id: 'p5', name: 'IMG_2052.jpg', size: 2_640_000, previewUrl: svgPhoto(['#FF9F5A', '#FFCC00']) },
  { id: 'p6', name: 'IMG_2053.jpg', size: 1_450_000, previewUrl: svgPhoto(['#5B7CFA', '#4FC3F7']) },
  { id: 'p7', name: 'IMG_2054.jpg', size: 2_010_000, previewUrl: svgPhoto(['#E07AD0', '#5B7CFA']) },
  { id: 'p8', name: 'IMG_2055.jpg', size: 3_480_000, previewUrl: svgPhoto(['#1A1438', '#3A2168', '#C76AE0']) },
]

export const SAMPLE_FILES: SampleFile[] = [
  { id: 'f1', name: 'Q3 路线图.pdf', ext: 'pdf', size: 2_516_582 },
  { id: 'f2', name: '竞品分析.xlsx', ext: 'xlsx', size: 901_120 },
  { id: 'f3', name: '会议纪要.docx', ext: 'docx', size: 327_680 },
  { id: 'f4', name: '需求文档.md', ext: 'md', size: 49_152 },
  { id: 'f5', name: '设计稿.fig', ext: 'fig', size: 5_347_737 },
]

// Brand-ish colors for file-type badges.
export const EXT_COLOR: Record<string, string> = {
  pdf: '#EF4444',
  xlsx: '#22C55E',
  docx: '#407CFF',
  md: '#8E8E93',
  fig: '#CC79FF',
  ppt: '#FFA03B',
  pptx: '#FFA03B',
}
