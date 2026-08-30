declare module 'opentype.js' {
  interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  interface Path {
    commands: unknown[];
    transform(matrix: number[]): void;
    getBoundingBox(): BoundingBox;
    toPathData(decimals?: number): string;
  }

  interface Font {
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }

  function parse(buffer: Buffer): Font;

  export { parse };
}
