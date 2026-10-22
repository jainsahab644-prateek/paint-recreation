import type { ReactNode } from 'react'
import { PALETTE, TOOL_ORDER, TOOLS, type ColorSlot, type ToolId } from '../paint/tools'
import { BrushIcon, ClearIcon, EraserIcon, PencilIcon, RedoIcon, SaveIcon, UndoIcon } from './icons'

const TOOL_ICONS: Record<ToolId, () => ReactNode> = {
  pencil: PencilIcon,
  brush: BrushIcon,
  eraser: EraserIcon,
}

interface Props {
  tool: ToolId
  size: number
  color1: string
  color2: string
  activeSlot: ColorSlot
  canUndo: boolean
  canRedo: boolean
  onToolChange(tool: ToolId): void
  onSizeChange(size: number): void
  onActiveSlotChange(slot: ColorSlot): void
  onColorPick(color: string): void
  onUndo(): void
  onRedo(): void
  onClear(): void
  onSave(): void
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="ribbon-group" aria-label={label}>
      <div className="ribbon-group-body">{children}</div>
      <span className="ribbon-group-label">{label}</span>
    </section>
  )
}

export function Ribbon(props: Props) {
  const spec = TOOLS[props.tool]
  const activeColor = props.activeSlot === 'color1' ? props.color1 : props.color2

  return (
    <header className="ribbon">
      <Group label="Edit">
        <button type="button" className="ribbon-btn" onClick={props.onUndo} disabled={!props.canUndo}
          title="Undo (Ctrl+Z)" data-testid="undo">
          <UndoIcon /><span>Undo</span>
        </button>
        <button type="button" className="ribbon-btn" onClick={props.onRedo} disabled={!props.canRedo}
          title="Redo (Ctrl+Y)" data-testid="redo">
          <RedoIcon /><span>Redo</span>
        </button>
        <button type="button" className="ribbon-btn" onClick={props.onClear} title="Clear canvas"
          data-testid="clear">
          <ClearIcon /><span>Clear</span>
        </button>
      </Group>

      <Group label="Tools">
        {TOOL_ORDER.map((id) => {
          const ToolIcon = TOOL_ICONS[id]
          return (
            <button key={id} type="button" className="ribbon-btn" aria-pressed={props.tool === id}
              onClick={() => props.onToolChange(id)} title={`${TOOLS[id].label} (${TOOLS[id].shortcut})`}
              data-testid={`tool-${id}`}>
              <ToolIcon /><span>{TOOLS[id].label}</span>
            </button>
          )
        })}
      </Group>

      <Group label="Size">
        <div className="size-control">
          <input type="range" min={spec.minSize} max={spec.maxSize} value={props.size}
            onChange={(e) => props.onSizeChange(Number(e.target.value))}
            aria-label="Brush size" data-testid="size" />
          <output className="size-value" data-testid="size-value">{props.size} px</output>
        </div>
      </Group>

      <Group label="Colours">
        <div className="color-slots">
          {(['color1', 'color2'] as const).map((slot, i) => (
            <button key={slot} type="button" className="color-slot" aria-pressed={props.activeSlot === slot}
              onClick={() => props.onActiveSlotChange(slot)} data-testid={`slot-${slot}`}
              title={i === 0 ? 'Colour 1 — left mouse button' : 'Colour 2 — right mouse button'}>
              <span className="swatch" style={{ background: slot === 'color1' ? props.color1 : props.color2 }} />
              <span>Colour {i + 1}</span>
            </button>
          ))}
        </div>
        <div className="palette" role="group" aria-label="Palette">
          {PALETTE.map((color) => (
            <button key={color} type="button" className="palette-swatch" style={{ background: color }}
              onClick={() => props.onColorPick(color)} aria-label={`Use ${color}`} title={color}
              data-testid={`swatch-${color.slice(1)}`} />
          ))}
        </div>
        <label className="custom-color" title="Edit colours">
          <input type="color" value={activeColor} onChange={(e) => props.onColorPick(e.target.value)}
            aria-label="Custom colour" data-testid="custom-color" />
          <span>Edit</span>
        </label>
      </Group>

      <Group label="File">
        <button type="button" className="ribbon-btn ribbon-btn-accent" onClick={props.onSave}
          title="Save as PNG (Ctrl+S)" data-testid="save">
          <SaveIcon /><span>Save PNG</span>
        </button>
      </Group>
    </header>
  )
}
