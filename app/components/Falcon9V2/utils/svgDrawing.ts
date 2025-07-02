// utils/svgDrawing.ts

// 一个简单的工厂函数，减少重复代码
function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tagName)
  for (const key in attributes) {
    el.setAttribute(key, String(attributes[key]))
  }
  return el
}

export function drawCircle(parent: SVGGElement, attributes: Record<string, string | number>) {
  parent.appendChild(createSvgElement('circle', attributes))
}

export function drawPath(parent: SVGGElement, attributes: Record<string, string | number>) {
  parent.appendChild(createSvgElement('path', attributes))
}

export function drawLine(parent: SVGGElement, attributes: Record<string, string | number>) {
  parent.appendChild(createSvgElement('line', attributes))
}

export function drawText(parent: SVGGElement, content: string, attributes: Record<string, string | number>) {
  const textEl = createSvgElement('text', attributes)
  textEl.textContent = content
  parent.appendChild(textEl)
}
