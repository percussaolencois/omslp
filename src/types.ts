export interface Partitura {
  id: string;
  titulo?: string;
  pdfUrl?: string;
  pagSelecionadas?: number[];
}

export interface NotebookPage {
  id: string;
  pdfUrl: string;
  originalPageNumber: number;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  type: 'pencil' | 'highlighter';
}
