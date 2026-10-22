// Linear undo/redo over full-canvas snapshots. A new action discards any redo
// branch; the oldest snapshot is dropped once the limit is reached.
export class History {
  private stack: ImageData[] = []
  private index = -1
  private readonly limit: number

  constructor(limit = 30) {
    this.limit = limit
  }

  reset(snapshot: ImageData) {
    this.stack = [snapshot]
    this.index = 0
  }

  push(snapshot: ImageData) {
    this.stack = this.stack.slice(0, this.index + 1)
    this.stack.push(snapshot)
    if (this.stack.length > this.limit) this.stack.shift()
    this.index = this.stack.length - 1
  }

  undo(): ImageData | null {
    if (!this.canUndo) return null
    this.index -= 1
    return this.stack[this.index]
  }

  redo(): ImageData | null {
    if (!this.canRedo) return null
    this.index += 1
    return this.stack[this.index]
  }

  get canUndo() {
    return this.index > 0
  }

  get canRedo() {
    return this.index < this.stack.length - 1
  }
}
